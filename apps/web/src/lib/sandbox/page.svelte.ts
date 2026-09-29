/**
 * Frame-stepping a real page: the virtual clock injected into a same-origin iframe.
 */
import { installClock, type ClockHandle } from "./clock";
import type { Transport } from "~/lib/transport.svelte";
import { tick } from "~/lib/sound";

export class PageTransport implements Transport {
  time = $state(0);
  playing = $state(true);
  rate = $state(1);
  fps = $state(60);
  duration = $state(3000);
  handle: ClockHandle | null = null;
  private frameCbs: ((t: number) => void)[] = [];

  constructor(private reload: (ff?: number) => void) {}

  attach(win: Window & typeof globalThis) {
    this.handle = installClock(win, { playing: this.playing, rate: this.rate });
    this.time = 0;
    this.duration = 3000;
    this.handle.onFrame((t) => {
      this.time = t;
      if (t > this.duration) this.duration = Math.ceil(t / 1000) * 1000;
      for (const cb of this.frameCbs) cb(t);
    });
  }
  onFrame(cb: (t: number) => void) {
    this.frameCbs.push(cb);
  }
  play() {
    this.handle?.play();
    this.playing = true;
  }
  pause() {
    this.handle?.pause();
    this.playing = false;
  }
  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }
  step(n: number) {
    tick();
    if (n > 0) {
      this.handle?.step(n, this.fps);
      this.playing = false;
    } else this.seek(this.time + (n * 1000) / this.fps);
  }
  seek(ms: number) {
    this.playing = false;
    this.handle?.pause();
    if (ms >= this.time) this.handle?.fastForward(ms, this.fps);
    else this.reload(ms);
  }
  setRate(r: number) {
    this.rate = r;
    this.handle?.setRate(r);
  }
  restart() {
    this.reload();
  }
}
