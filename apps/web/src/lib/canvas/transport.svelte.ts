/**
 * Transport for an in-page canvas program. The simulation always advances in fixed steps
 * (1/hz seconds), so any time can be reached by resetting and fast-forwarding: deterministic.
 */
import { createLoop, type Loop } from "@inbetween/core";
import type { Transport } from "~/lib/transport.svelte";
import { tick } from "~/lib/sound";
import type { Program } from "./runner";

export class ProgramTransport implements Transport {
  time = $state(0);
  playing = $state(false);
  rate = $state(1);
  fps = $state(60);
  duration = $state(4000);
  /** The width the current pass was laid out for (setup reads it once). */
  width = 0;
  /** Called at the end of a playing pass, just before it starts over (the last frame is still drawn). */
  onwrap: (() => void) | null = null;
  /** While this says so, a pass that has reached its end keeps running instead of starting over. */
  holdWrap: (() => boolean) | null = null;
  private state: unknown = null;
  private acc = 0;
  private loop: Loop | null = null;

  constructor(
    private get: () => { program: Program | null; w: number; h: number; hz: number },
    private render: (state: unknown) => void,
  ) {}

  private stepMs() {
    return 1000 / (this.get().hz || 60);
  }
  reset() {
    const { program, w, h } = this.get();
    this.state = program?.setup ? program.setup(w, h) : {};
    this.width = w;
    this.time = 0;
    this.acc = 0;
  }
  private simulate(n: number) {
    const { program } = this.get();
    const dt = this.stepMs() / 1000;
    for (let i = 0; i < n; i++) {
      try {
        program?.update?.(this.state, dt);
      } catch (e) {
        console.error(e);
        this.pause();
        return;
      }
      this.time += this.stepMs();
    }
  }
  get current() {
    if (this.state == null) this.reset();
    return this.state;
  }
  draw() {
    this.render(this.current);
  }
  play() {
    if (this.playing) return;
    if (this.state == null) this.reset();
    this.playing = true;
    this.loop = createLoop(({ dt }) => {
      this.acc += dt * 1000 * this.rate;
      const ms = this.stepMs();
      let n = 0;
      // Step when three-quarters of a step is owed, not a whole one. The display's frames wobble by a
      // fraction of a millisecond; with the threshold at exactly one step, a frame that lands a hair early
      // takes no step and the next takes two, and the motion judders. This keeps the owed time well
      // away from the threshold at 60 and 120Hz (the simulation runs at most a quarter step ahead).
      while (this.acc >= ms * 0.75 && n < 8) {
        this.acc -= ms;
        this.simulate(1);
        n++;
      }
      if (this.duration && this.time >= this.duration && !this.holdWrap?.()) {
        this.onwrap?.();
        this.reset();
      }
      this.draw();
    });
  }
  pause() {
    this.playing = false;
    this.loop?.stop();
    this.loop = null;
  }
  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }
  step(n: number) {
    this.pause();
    tick();
    if (n > 0) this.simulate(n);
    else this.seek(this.time + n * this.stepMs());
    this.draw();
  }
  seek(ms: number) {
    const target = Math.max(0, Math.min(ms, this.duration));
    if (target < this.time || this.state == null) this.reset();
    const n = Math.round((target - this.time) / this.stepMs());
    this.simulate(Math.max(0, n));
    this.draw();
  }
  setRate(r: number) {
    this.rate = r;
  }
  restart() {
    this.reset();
    this.draw();
  }
  /** Run the whole pass offline, calling back every `every` steps (for onion-skin stills). */
  offline(every: number, cb: (state: unknown, i: number, total: number) => void) {
    // Runs the whole pass without touching reactive state (no time updates per step).
    const { program, w, h } = this.get();
    const state = program?.setup ? program.setup(w, h) : {};
    const dt = this.stepMs() / 1000;
    const total = Math.round(this.duration / this.stepMs());
    for (let i = 0; i <= total; i++) {
      if (i % every === 0 || i === total) cb(state, i, total);
      try {
        program?.update?.(state, dt);
      } catch {
        break;
      }
    }
  }
  destroy() {
    this.pause();
  }
}
