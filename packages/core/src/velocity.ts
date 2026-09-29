/**
 * Velocity tracking for flicks: where was the pointer heading when it let go?
 * Only the last ~100ms matter; older samples describe a different gesture.
 */

export interface VelocityTracker {
  add(value: number, time: number): void;
  /** Units per second. */
  velocity(): number;
  reset(): void;
}

export function velocityTracker(windowMs = 100): VelocityTracker {
  let samples: { v: number; t: number }[] = [];
  return {
    add(value, time) {
      samples.push({ v: value, t: time });
      const cutoff = time - windowMs;
      while (samples.length > 2 && samples[0].t < cutoff) samples.shift();
    },
    velocity() {
      if (samples.length < 2) return 0;
      // Least-squares slope: steadier than first-to-last.
      const n = samples.length;
      const t0 = samples[0].t;
      let st = 0, sv = 0, stt = 0, stv = 0;
      for (const s of samples) {
        const t = (s.t - t0) / 1000;
        st += t;
        sv += s.v;
        stt += t * t;
        stv += t * s.v;
      }
      const d = n * stt - st * st;
      return d === 0 ? 0 : (n * stv - st * sv) / d;
    },
    reset() {
      samples = [];
    },
  };
}
