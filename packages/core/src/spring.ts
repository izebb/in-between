/**
 * Damped harmonic oscillator, solved in closed form.
 *
 *   m·x'' + c·x' + k·x = 0      (x = displacement from the target)
 *
 * Two ways to describe the same spring:
 *   physics:  stiffness k, damping c, mass m
 *   designer: response (≈ the period, seconds) and bounce (0 = none, 1 = forever)
 *
 * The designer pair is Apple's model (WWDC 2018, 2023):
 *   k = (2π / response)² · m
 *   c = 4π · ζ · m / response
 *   ζ = 1 − bounce          (bounce ≥ 0)
 *   ζ = 1 / (1 + bounce)    (bounce < 0, overdamped)
 */

import { toLinear, type ToLinearOptions } from "./linear.ts";

export interface SpringParams {
  stiffness: number;
  damping: number;
  mass: number;
}

export interface SpringDesign {
  /** Seconds. Roughly how long one oscillation takes; lower = snappier. */
  response: number;
  /** 0 = critically damped, >0 overshoots, <0 overdamped (sluggish). */
  bounce: number;
}

export function fromResponse(response: number, bounce: number, mass = 1): SpringParams {
  const r = Math.max(response, 1e-4);
  const zeta = bounce >= 0 ? 1 - bounce : 1 / (1 + bounce);
  return {
    stiffness: Math.pow((2 * Math.PI) / r, 2) * mass,
    damping: (4 * Math.PI * zeta * mass) / r,
    mass,
  };
}

export function toResponse({ stiffness, damping, mass }: SpringParams): SpringDesign {
  const response = 2 * Math.PI * Math.sqrt(mass / stiffness);
  const zeta = dampingRatio({ stiffness, damping, mass });
  const bounce = zeta <= 1 ? 1 - zeta : 1 / zeta - 1;
  return { response, bounce };
}

/** ζ: < 1 underdamped (overshoots), = 1 critical, > 1 overdamped. */
export function dampingRatio({ stiffness, damping, mass }: SpringParams): number {
  return damping / (2 * Math.sqrt(stiffness * mass));
}

export interface SpringState {
  position: number;
  velocity: number;
}

export interface Spring {
  readonly params: SpringParams;
  readonly from: number;
  readonly to: number;
  /** Position at time t (seconds). */
  position(t: number): number;
  /** Velocity at time t (units per second). */
  velocity(t: number): number;
  /** Seconds until it rests (within restDelta of the target, slower than restSpeed). */
  settleTime(): number;
  /** Normalised progress (0 → 1) at time t. */
  progress(t: number): number;
}

export interface SpringOptions {
  from?: number;
  to?: number;
  /** Initial velocity in units per second. This is what makes springs interruptible. */
  velocity?: number;
  /** Distance from target counted as "at rest", as a fraction of |to − from| (or absolute if range is 0). */
  restDelta?: number;
  /** Speed counted as "at rest", as a fraction of |to − from| per second. */
  restSpeed?: number;
}

export function spring(params: SpringParams, opts: SpringOptions = {}): Spring {
  const from = opts.from ?? 0;
  const to = opts.to ?? 1;
  const v0 = opts.velocity ?? 0;
  const { stiffness: k, damping: c, mass: m } = params;
  const range = Math.abs(to - from) || 1;
  const restDelta = (opts.restDelta ?? 0.001) * range;
  const restSpeed = (opts.restSpeed ?? 0.01) * range;

  const x0 = from - to; // initial displacement
  const w0 = Math.sqrt(k / m);
  const zeta = c / (2 * Math.sqrt(k * m));

  let disp: (t: number) => number;
  let vel: (t: number) => number;

  if (Math.abs(zeta - 1) < 1e-6) {
    // Critically damped: fastest return without overshoot.
    const b = v0 + w0 * x0;
    disp = (t) => Math.exp(-w0 * t) * (x0 + b * t);
    vel = (t) => Math.exp(-w0 * t) * (b - w0 * (x0 + b * t));
  } else if (zeta < 1) {
    // Underdamped: oscillates inside a decaying envelope.
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    const a = x0;
    const b = (v0 + zeta * w0 * x0) / wd;
    disp = (t) => Math.exp(-zeta * w0 * t) * (a * Math.cos(wd * t) + b * Math.sin(wd * t));
    vel = (t) => {
      const e = Math.exp(-zeta * w0 * t);
      const cos = Math.cos(wd * t);
      const sin = Math.sin(wd * t);
      return e * ((b * wd - zeta * w0 * a) * cos - (a * wd + zeta * w0 * b) * sin);
    };
  } else {
    // Overdamped: two decaying exponentials, no overshoot, slow tail.
    const s = Math.sqrt(zeta * zeta - 1);
    const r1 = -w0 * (zeta - s);
    const r2 = -w0 * (zeta + s);
    const c2 = (v0 - r1 * x0) / (r2 - r1);
    const c1 = x0 - c2;
    disp = (t) => c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
    vel = (t) => c1 * r1 * Math.exp(r1 * t) + c2 * r2 * Math.exp(r2 * t);
  }

  let settle: number | null = null;

  return {
    params,
    from,
    to,
    position: (t) => to + disp(Math.max(0, t)),
    velocity: (t) => vel(Math.max(0, t)),
    progress: (t) => (to === from ? 1 : (to + disp(Math.max(0, t)) - from) / (to - from)),
    settleTime() {
      if (settle !== null) return settle;
      // Walk forward; remember the last moment it was still moving.
      const dt = 1 / 1000;
      const max = 60;
      let last = 0;
      let calm = 0;
      for (let t = 0; t <= max; t += dt) {
        if (Math.abs(disp(t)) > restDelta || Math.abs(vel(t)) > restSpeed) {
          last = t;
          calm = 0;
        } else if ((calm += dt) > 0.25 && Math.abs(disp(t)) < restDelta * 0.1) {
          break;
        }
      }
      settle = last;
      return settle;
    },
  };
}

/** A spring as a normalised easing over its own settle time: t ∈ [0,1] → progress. */
export function springEasing(params: SpringParams, velocity = 0) {
  const s = spring(params, { from: 0, to: 1, velocity });
  const duration = s.settleTime();
  return {
    duration,
    ease: (x: number) => (x >= 1 ? 1 : s.position(x * duration)),
  };
}

/** Compile a spring to CSS: a `linear()` easing plus the duration (ms) it must run for. */
export function springToLinear(
  params: SpringParams,
  opts: ToLinearOptions & { velocity?: number } = {},
): { easing: string; duration: number } {
  const { duration, ease } = springEasing(params, opts.velocity ?? 0);
  return { easing: toLinear(ease, opts), duration: Math.round(duration * 1000) };
}
