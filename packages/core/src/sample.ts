/**
 * Frames: turning continuous motion into the positions a screen actually shows.
 * A spacing chart is just these samples, drawn as ticks.
 */

/**
 * Times (ms) of every frame from 0 to duration inclusive: duration × fps frames (rounded), spaced
 * evenly so the last one lands on the end (e.g. 280ms at 60fps: 17 frames of 16.47ms, not 16.67).
 */
export function frameTimes(duration: number, fps = 60): number[] {
  const n = Math.max(1, Math.round((duration / 1000) * fps));
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push((i / n) * duration);
  return out;
}

/** Number of frame intervals a duration spans at fps. */
export function frameCount(duration: number, fps = 60): number {
  return Math.max(1, Math.round((duration / 1000) * fps));
}

export const msToFrames = (ms: number, fps = 60) => (ms / 1000) * fps;
export const framesToMs = (frames: number, fps = 60) => (frames / fps) * 1000;

/** Sample f(t) at each frame time. */
export function sampleFrames(f: (t: number) => number, duration: number, fps = 60): number[] {
  return frameTimes(duration, fps).map(f);
}

/** Distance covered between consecutive frames: the spacing. Big gaps read as fast. */
export function spacing(values: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < values.length; i++) out.push(values[i] - values[i - 1]);
  return out;
}

/** Numeric derivative of a sampled easing, normalised so linear = 1 everywhere. */
export function velocityCurve(ease: (x: number) => number, samples = 120): { x: number; v: number }[] {
  const out: { x: number; v: number }[] = [];
  const h = 1 / (samples * 4);
  for (let i = 0; i <= samples; i++) {
    const x = i / samples;
    const a = Math.max(0, x - h);
    const b = Math.min(1, x + h);
    out.push({ x, v: (ease(b) - ease(a)) / (b - a) });
  }
  return out;
}
