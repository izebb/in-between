/**
 * Cubic Bézier timing functions, the way browsers solve them.
 *
 * A CSS `cubic-bezier(x1, y1, x2, y2)` is a parametric curve from (0,0) to (1,1).
 * Time is on x, progress on y. To ask "how far along are we at time x?" we must
 * first find the curve parameter `t` whose x equals our time, then read y at `t`.
 * That inverse is solved with Newton–Raphson, falling back to bisection.
 */

export type EasingFn = (x: number) => number;

export interface BezierEasing extends EasingFn {
  readonly points: readonly [number, number, number, number];
  /** Slope dy/dx at time x: the instantaneous speed, relative to linear. */
  velocity(x: number): number;
}

const NEWTON_ITERATIONS = 8;
const NEWTON_EPSILON = 1e-7;
const BISECT_ITERATIONS = 40;

export function cubicBezier(x1: number, y1: number, x2: number, y2: number): BezierEasing {
  // Polynomial coefficients for B(t) = a·t³ + b·t² + c·t (P0 = 0, P3 = 1).
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  const slopeY = (t: number) => (3 * ay * t + 2 * by) * t + cy;

  function solveT(x: number): number {
    // Newton–Raphson: fast when the slope is healthy.
    let t = x;
    for (let i = 0; i < NEWTON_ITERATIONS; i++) {
      const err = sampleX(t) - x;
      if (Math.abs(err) < NEWTON_EPSILON) return t;
      const d = slopeX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    // Bisection: slow and certain. x(t) is monotonic because x1, x2 ∈ [0, 1].
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < BISECT_ITERATIONS; i++) {
      const v = sampleX(t);
      if (Math.abs(v - x) < NEWTON_EPSILON) return t;
      if (x > v) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return t;
  }

  const linear = x1 === y1 && x2 === y2;

  const fn = ((x: number) => {
    if (linear) return x;
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return sampleY(solveT(x));
  }) as BezierEasing;

  Object.defineProperty(fn, "points", { value: [x1, y1, x2, y2] as const });
  fn.velocity = (x: number) => {
    if (linear) return 1;
    const t = solveT(Math.min(1, Math.max(0, x)));
    const dx = slopeX(t);
    const dy = slopeY(t);
    if (Math.abs(dx) < 1e-9) {
      // Vertical tangent (x1 = 0 or x2 = 1): approach the limit numerically.
      const h = 1e-4;
      const a = Math.max(0, x - h);
      const b = Math.min(1, x + h);
      return (fn(b) - fn(a)) / (b - a);
    }
    return dy / dx;
  };
  return fn;
}

/** The point on the curve at parameter t, for drawing the curve itself. */
export function bezierPoint(
  p: readonly [number, number, number, number],
  t: number,
): [number, number] {
  const [x1, y1, x2, y2] = p;
  const u = 1 - t;
  const x = 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t;
  const y = 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t;
  return [x, y];
}
