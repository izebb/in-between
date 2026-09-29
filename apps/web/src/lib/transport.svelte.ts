/**
 * A Transport is anything with time you can play, pause, slow down, step and scrub.
 * The time bar (the Frame Stepper under every stage) drives a Transport and doesn't
 * care whether it's the model playhead or a sandboxed browser page.
 */

import { createPlayhead, type Playhead } from "@inbetween/core";
import { tick } from "./sound";

export interface Transport {
  readonly time: number;
  readonly duration: number;
  readonly playing: boolean;
  readonly rate: number;
  readonly fps: number;
  play(): void;
  pause(): void;
  toggle(): void;
  step(n: number): void;
  seek(ms: number): void;
  setRate(r: number): void;
  restart(): void;
}

export class PlayheadTransport implements Transport {
  time = $state(0);
  playing = $state(false);
  rate = $state(1);
  duration = $state(1000);
  fps = $state(60);
  private head: Playhead;

  constructor(opts: { duration: number; hold?: number; fps?: number; autoplay?: boolean; loop?: boolean }) {
    this.duration = opts.duration;
    this.fps = opts.fps ?? 60;
    this.head = createPlayhead({ duration: opts.duration, hold: opts.hold ?? 600, loop: opts.loop ?? true, fps: this.fps });
    this.head.subscribe((h) => {
      this.time = h.time;
      this.playing = h.playing;
      this.rate = h.rate;
    });
    if (opts.autoplay) this.head.play();
  }
  setDuration(ms: number) {
    this.duration = ms;
    this.head.duration = ms;
    if (this.head.time > ms) this.head.seek(ms);
  }
  setFps(fps: number) {
    this.fps = fps;
    this.head.fps = fps;
  }
  setHold(ms: number) {
    this.head.hold = ms;
  }
  play() {
    this.head.play();
  }
  pause() {
    this.head.pause();
  }
  toggle() {
    this.head.toggle();
  }
  step(n: number) {
    this.head.step(n);
    tick();
  }
  seek(ms: number) {
    this.head.seek(ms);
  }
  setRate(r: number) {
    this.head.rate = r;
    this.rate = r;
  }
  restart() {
    this.head.restart();
  }
  destroy() {
    this.head.destroy();
  }
}
