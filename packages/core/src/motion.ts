/**
 * A single described motion, and how to evaluate it at any time.
 *
 * This is the shape every lab instrument edits and every code dialect prints.
 */

import { cubicBezier, type EasingFn } from "./bezier.ts";
import { steps, type StepPosition } from "./easing.ts";
import { linearEasing, type LinearStop } from "./linear.ts";
import { spring, springEasing } from "./spring.ts";

export type EasingSpec =
  | { type: "cubic"; x1: number; y1: number; x2: number; y2: number }
  | { type: "spring"; stiffness: number; damping: number; mass: number; velocity?: number }
  | { type: "steps"; steps: number; position: StepPosition }
  | { type: "linear" }
  | { type: "points"; stops: LinearStop[] };

export type Property = "x" | "y" | "scale" | "opacity" | "rotate";

export interface Move {
  /** Which element: becomes the class name in code (`.box`). */
  target: string;
  property: Property;
  from: number;
  to: number;
  /** Milliseconds. For springs this is derived from the physics and ignored. */
  duration: number;
  delay: number;
  easing: EasingSpec;
}

export const PROPERTY_UNITS: Record<Property, string> = {
  x: "px",
  y: "px",
  scale: "",
  opacity: "",
  rotate: "deg",
};

export interface ResolvedMove {
  move: Move;
  ease: EasingFn;
  /** Active duration, ms (spring settle time for springs). */
  duration: number;
  delay: number;
  /** delay + duration, ms. */
  end: number;
  /** Progress (0..1, may overshoot) at time t ms, from the start of the timeline. */
  progress(t: number): number;
  /** Property value at time t ms. */
  value(t: number): number;
  /** Rate of change of value at t, units per second. */
  velocity(t: number): number;
}

export function easingFn(spec: EasingSpec): { ease: EasingFn; duration: number | null } {
  switch (spec.type) {
    case "cubic":
      return { ease: cubicBezier(spec.x1, spec.y1, spec.x2, spec.y2), duration: null };
    case "spring": {
      const { ease, duration } = springEasing(spec, spec.velocity ?? 0);
      return { ease, duration: duration * 1000 };
    }
    case "steps":
      return { ease: steps(spec.steps, spec.position), duration: null };
    case "points":
      return { ease: linearEasing(spec.stops), duration: null };
    default:
      return { ease: (x) => x, duration: null };
  }
}

export function resolveMove(move: Move): ResolvedMove {
  const { ease, duration: derived } = easingFn(move.easing);
  const duration = Math.max(1, derived ?? move.duration);
  const delay = move.delay;
  const sp =
    move.easing.type === "spring"
      ? spring(move.easing, { from: 0, to: 1, velocity: move.easing.velocity ?? 0 })
      : null;
  const progress = (t: number) => {
    const local = t - delay;
    if (local <= 0) return 0;
    if (local >= duration) return 1;
    return sp ? sp.position(local / 1000) : ease(local / duration);
  };
  const value = (t: number) => move.from + (move.to - move.from) * progress(t);
  return {
    move,
    ease,
    duration,
    delay,
    end: delay + duration,
    progress,
    value,
    velocity(t) {
      const h = 0.5;
      return ((value(t + h) - value(t - h)) / (2 * h)) * 1000;
    },
  };
}

/** Round to a sensible number of decimals for a property. */
export function roundFor(property: Property, v: number): number {
  const d = property === "x" || property === "y" || property === "rotate" ? 1 : 3;
  const f = Math.pow(10, d);
  return Math.round(v * f) / f;
}

/** Duration an EasingSpec will actually run for, given a nominal duration. */
export function effectiveDuration(spec: EasingSpec, nominal: number): number {
  const d = easingFn(spec).duration;
  return Math.round(d ?? nominal);
}
