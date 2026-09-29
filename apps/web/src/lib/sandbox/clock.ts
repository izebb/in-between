/**
 * The virtual clock. Installed into a window (a sandboxed iframe, or a same-origin page
 * in the Frame Stepper), it takes over time itself:
 *   - requestAnimationFrame / performance.now / Date.now follow virtual time
 *   - every CSS transition, CSS animation and WAAPI animation is paused and driven by it
 * so anything on that page can be slowed, paused, stepped frame by frame, and sampled.
 *
 * IMPORTANT: this function is serialised with .toString() into sandbox iframes.
 * It must stay self-contained: no imports, no references to outer scope.
 */

export interface ClockHandle {
  /** Virtual time, ms. */
  time(): number;
  play(): void;
  pause(): void;
  playing(): boolean;
  setRate(r: number): void;
  /** Advance exactly n frames of 1000/fps ms (works while paused). */
  step(n?: number, fps?: number): void;
  /** Run frames synchronously until virtual time reaches ms (fast-forward). */
  fastForward(ms: number, fps?: number): void;
  /** Called after every virtual frame. */
  onFrame(cb: (t: number, dt: number) => void): void;
  /** Stop driving (restores nothing; the page is discarded after). */
  destroy(): void;
}

export function installClock(win: Window & typeof globalThis, opts: { playing?: boolean; rate?: number } = {}): ClockHandle {
  const realRAF = win.requestAnimationFrame.bind(win);
  const realCancel = win.cancelAnimationFrame.bind(win);
  const perf = win.performance;
  const realNow = perf.now.bind(perf);
  const DATE0 = Date.now();
  let vt = 0;
  let rate = opts.rate ?? 1;
  let isPlaying = opts.playing ?? true;
  let lastReal = realNow();
  let alive = true;
  let seq = 0;
  let pending = new Map<number, FrameRequestCallback>();
  const births = new WeakMap<Animation, number>();
  const listeners: ((t: number, dt: number) => void)[] = [];

  win.requestAnimationFrame = (cb: FrameRequestCallback) => {
    pending.set(++seq, cb);
    return seq;
  };
  win.cancelAnimationFrame = (id: number) => {
    pending.delete(id);
  };
  try {
    perf.now = () => vt;
  } catch {
    Object.defineProperty(perf, "now", { value: () => vt, configurable: true });
  }
  win.Date.now = () => DATE0 + vt;

  function driveAnimations() {
    const anims = win.document.getAnimations ? win.document.getAnimations() : [];
    for (const a of anims) {
      if (!births.has(a)) {
        // Newly started: remember when (in virtual time) and take the wheel.
        const ct = typeof a.currentTime === "number" ? a.currentTime : 0;
        births.set(a, vt - Math.min(ct, 0));
        try {
          a.pause();
        } catch {
          /* already finished */
        }
      }
      try {
        a.currentTime = Math.max(0, vt - (births.get(a) as number));
      } catch {
        /* ignore */
      }
    }
  }

  function frame(dt: number) {
    vt += dt;
    const cbs = [...pending.values()];
    pending = new Map();
    for (const cb of cbs) {
      try {
        cb(vt);
      } catch (e) {
        setTimeout(() => {
          throw e;
        });
      }
    }
    driveAnimations();
    for (const l of listeners) l(vt, dt);
  }

  function tick() {
    if (!alive) return;
    const now = realNow();
    const dt = Math.min(now - lastReal, 1000 / 20);
    lastReal = now;
    if (isPlaying) frame(dt * rate);
    else driveAnimations(); // keep newly created animations frozen
    realRAF(tick);
  }
  realRAF(tick);

  return {
    time: () => vt,
    play() {
      isPlaying = true;
      lastReal = realNow();
    },
    pause() {
      isPlaying = false;
    },
    playing: () => isPlaying,
    setRate(r: number) {
      rate = r;
    },
    step(n = 1, fps = 60) {
      isPlaying = false;
      for (let i = 0; i < n; i++) frame(1000 / fps);
    },
    fastForward(ms: number, fps = 60) {
      const dt = 1000 / fps;
      let guard = 0;
      while (vt + dt <= ms && guard++ < 20000) frame(dt);
    },
    onFrame(cb) {
      listeners.push(cb);
    },
    destroy() {
      alive = false;
      realCancel(0);
    },
  };
}
