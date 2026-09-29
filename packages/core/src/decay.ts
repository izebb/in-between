/**
 * Momentum and friction: exponential decay.
 *
 * A flicked object keeps its velocity and loses a fixed fraction of it per unit time:
 *   v(t) = v₀ · e^(−λt)
 *   x(t) = x₀ + (v₀ / λ) · (1 − e^(−λt))
 * so it lands at x₀ + v₀ / λ. That landing point is known the moment you let go.
 *
 * iOS describes friction as a deceleration rate r: velocity is multiplied by r every
 * millisecond. `normal` is 0.998, `fast` is 0.99. Then λ = −ln(r) · 1000 per second.
 */

export const DecelerationRate = { normal: 0.998, fast: 0.99 } as const;

/** Friction coefficient λ (per second) from an iOS-style per-millisecond rate. */
export function lambdaFromRate(rate: number): number {
  return -Math.log(rate) * 1000;
}

/**
 * Where a flick will land, as Apple writes it (WWDC 2018, "Designing Fluid Interfaces").
 * velocity in points per second; result is the distance travelled.
 */
export function project(velocity: number, rate: number = DecelerationRate.normal): number {
  return ((velocity / 1000) * rate) / (1 - rate);
}

export interface Decay {
  position(t: number): number;
  velocity(t: number): number;
  /** The resting point: from + v₀/λ. */
  target: number;
  /** Seconds until speed drops under restSpeed (units/s). */
  settleTime(restSpeed?: number): number;
}

export function decay(opts: { from?: number; velocity: number; lambda?: number; rate?: number }): Decay {
  const from = opts.from ?? 0;
  const v0 = opts.velocity;
  const lambda = opts.lambda ?? lambdaFromRate(opts.rate ?? DecelerationRate.normal);
  const target = from + v0 / lambda;
  return {
    target,
    position: (t) => from + (v0 / lambda) * (1 - Math.exp(-lambda * Math.max(0, t))),
    velocity: (t) => v0 * Math.exp(-lambda * Math.max(0, t)),
    settleTime(restSpeed = 1) {
      if (Math.abs(v0) <= restSpeed) return 0;
      return Math.log(Math.abs(v0) / restSpeed) / lambda;
    },
  };
}

/**
 * Rubber-banding past an edge (iOS scroll views):
 * the further you pull, the less it follows. c ≈ 0.55 on iOS.
 */
export function rubberband(overshoot: number, dimension: number, c = 0.55): number {
  const sign = Math.sign(overshoot);
  const x = Math.abs(overshoot);
  return sign * (1 - 1 / ((x * c) / dimension + 1)) * dimension;
}
