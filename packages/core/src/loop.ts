/**
 * The loop: requestAnimationFrame with a real `dt`.
 *
 * Motion should depend on elapsed time, never on frame count. A 120Hz display calls
 * you twice as often as a 60Hz one; code that moves "2px per frame" runs twice as fast
 * there. Code that moves "120px per second × dt" doesn't.
 */

export interface Clock {
  now(): number; // milliseconds
  request(cb: (time: number) => void): number;
  cancel(id: number): void;
}

export const rafClock: Clock = {
  now: () => (typeof performance !== "undefined" ? performance.now() : Date.now()),
  request: (cb) =>
    typeof requestAnimationFrame !== "undefined"
      ? requestAnimationFrame(cb)
      : (setTimeout(() => cb(rafClock.now()), 1000 / 60) as unknown as number),
  cancel: (id) =>
    typeof cancelAnimationFrame !== "undefined" ? cancelAnimationFrame(id) : clearTimeout(id),
};

/** A clock you advance by hand. Deterministic: good for stepping frames and for checks. */
export interface ManualClock extends Clock {
  /** Advance time by ms and fire pending callbacks once. */
  tick(ms: number): void;
}

export function manualClock(start = 0): ManualClock {
  let time = start;
  let id = 0;
  const pending = new Map<number, (t: number) => void>();
  return {
    now: () => time,
    request(cb) {
      pending.set(++id, cb);
      return id;
    },
    cancel(i) {
      pending.delete(i);
    },
    tick(ms) {
      time += ms;
      const cbs = [...pending.values()];
      pending.clear();
      for (const cb of cbs) cb(time);
    },
  };
}

export interface FrameInfo {
  /** Seconds since the previous frame (scaled, clamped). */
  dt: number;
  /** Seconds since start (scaled). */
  time: number;
  /** Frames since start. */
  frame: number;
}

export interface LoopOptions {
  clock?: Clock;
  /** Longest dt allowed, seconds. Stops a background tab from teleporting objects. */
  maxDt?: number;
  /** Playback speed: 1 = real time, 0.25 = quarter speed. */
  timeScale?: number;
  /** Start immediately. Default true. */
  autostart?: boolean;
}

export interface Loop {
  start(): void;
  stop(): void;
  readonly running: boolean;
  /** Run exactly one frame of `dt` seconds (for frame stepping while paused). */
  step(dt?: number): void;
  timeScale: number;
  readonly time: number;
  readonly frame: number;
}

/**
 * Calls `onFrame` every animation frame. Return `false` from onFrame to stop.
 */
export function createLoop(onFrame: (f: FrameInfo) => void | boolean, opts: LoopOptions = {}): Loop {
  const clock = opts.clock ?? rafClock;
  const maxDt = opts.maxDt ?? 1 / 15;
  let running = false;
  let handle = 0;
  let last = 0;
  let time = 0;
  let frame = 0;

  const run = (dt: number) => {
    time += dt;
    frame += 1;
    const keep = onFrame({ dt, time, frame });
    if (keep === false) loop.stop();
  };

  const tick = (now: number) => {
    if (!running) return;
    const raw = Math.max(0, (now - last) / 1000);
    last = now;
    run(Math.min(raw, maxDt) * loop.timeScale);
    if (running) handle = clock.request(tick);
  };

  const loop: Loop = {
    timeScale: opts.timeScale ?? 1,
    get running() {
      return running;
    },
    get time() {
      return time;
    },
    get frame() {
      return frame;
    },
    start() {
      if (running) return;
      running = true;
      last = clock.now();
      handle = clock.request(tick);
    },
    stop() {
      running = false;
      clock.cancel(handle);
    },
    step(dt = 1 / 60) {
      run(dt);
    },
  };
  if (opts.autostart !== false) loop.start();
  return loop;
}
