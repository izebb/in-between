/**
 * Transport for a sandboxed stage. Forward is cheap (step / fast-forward the virtual clock);
 * backward means reloading the page and fast-forwarding to the target time. Deterministic,
 * because the page only ever sees virtual time.
 */
import type { Transport } from "~/lib/transport.svelte";
import { tick } from "~/lib/sound";

export class SandboxTransport implements Transport {
  time = $state(0);
  playing = $state(true);
  rate = $state(1);
  duration = $state(1000);
  fps = $state(60);
  hold = 700;
  private lastBack = 0;
  private backTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private post: (m: Record<string, unknown>) => void,
    private reload: (o: { playing: boolean; ff?: number }) => void,
  ) {}

  /** Called by the stage for every frame the page reports. */
  onFrame(t: number) {
    this.time = t;
    if (this.playing && t >= this.duration + this.hold) this.reload({ playing: true });
  }
  play() {
    if (this.time >= this.duration) this.reload({ playing: true });
    else this.post({ cmd: "play" });
    this.playing = true;
  }
  pause() {
    this.post({ cmd: "pause" });
    this.playing = false;
  }
  toggle() {
    if (this.playing) this.pause();
    else this.play();
  }
  step(n: number) {
    this.playing = false;
    tick();
    if (n > 0) this.post({ cmd: "step", value: n, fps: this.fps });
    // From the hold after the end, one frame back is one frame before the end, not the end again.
    else this.seek(Math.min(this.time, this.duration) + (n * 1000) / this.fps);
  }
  seek(ms: number) {
    const target = Math.max(0, Math.min(ms, this.duration));
    this.playing = false;
    if (target >= this.time) {
      this.post({ cmd: "pause" });
      this.post({ cmd: "ff", value: target, fps: this.fps });
      return;
    }
    // Backwards: reload and fast-forward, at most every 80ms while scrubbing.
    const now = performance.now();
    const go = () => {
      this.lastBack = performance.now();
      this.reload({ playing: false, ff: target });
    };
    if (now - this.lastBack > 80) go();
    else {
      if (this.backTimer) clearTimeout(this.backTimer);
      this.backTimer = setTimeout(go, 80);
    }
  }
  setRate(r: number) {
    this.rate = r;
    this.post({ cmd: "rate", value: r });
  }
  restart() {
    this.reload({ playing: this.playing });
  }
}
