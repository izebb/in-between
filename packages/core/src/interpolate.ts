/**
 * The small maths every animation is made of.
 */

export const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));

/** Linear interpolation: a at t=0, b at t=1. */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The inverse: where v sits between a and b, as 0..1. */
export const invLerp = (a: number, b: number, v: number) => (a === b ? 0 : (v - a) / (b - a));

/** Map v from one range to another. */
export const remap = (v: number, a0: number, a1: number, b0: number, b1: number) =>
  lerp(b0, b1, invLerp(a0, a1, v));

/**
 * The frame-rate trap: `x += (target - x) * k` per frame.
 * At 120Hz it runs twice as many times per second as at 60Hz, so it converges faster.
 */
export const smoothNaive = (x: number, target: number, k: number) => x + (target - x) * k;

/**
 * The fix: exponential smoothing with a rate λ (per second), exact for any dt.
 *   x += (target − x) · (1 − e^(−λ·dt))
 */
export const damp = (x: number, target: number, lambda: number, dt: number) =>
  lerp(x, target, 1 - Math.exp(-lambda * dt));

/** The λ that matches a per-frame k at a given fps (so both converge equally). */
export const lambdaFromPerFrame = (k: number, fps = 60) => -Math.log(1 - k) * fps;

/** Shortest-path angle lerp in radians. */
export function lerpAngle(a: number, b: number, t: number): number {
  const d = ((((b - a) % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return a + d * t;
}
