/**
 * Shorthand for chapters: write motion as short strings in MDX, get full specs.
 *
 *   easing:  "linear" | "ease" | "ease-in" | "ease-out" | "ease-in-out"
 *            "--ease-out" | "--ease-in" | "--ease-inout"          (the app's tokens)
 *            "cubic-bezier(.2,.8,.2,1)" | "steps(6)" | "steps(4, jump-start)"
 *            "spring(170 26 1)"                                   (stiffness damping mass)
 *            "spring(response .5 bounce .2)"                      (the designer's pair)
 *            "spring.snappy" | "spring.soft"                      (tokens)
 *            "linear(0, .5 20%, 1)"                               (custom stops)
 */

import { CSS_KEYWORDS, fromResponse, parseLinear, springToLinear, formatLinear, type EasingSpec, type Move, type Property, type StepPosition } from "@inbetween/core";
import { easing as tokenEasing, spring as tokenSpring } from "~/motion/tokens";

export function parseSpec(s: string | EasingSpec | undefined): EasingSpec {
  if (!s) return { type: "cubic", x1: 0.2, y1: 0.8, x2: 0.2, y2: 1 };
  if (typeof s !== "string") return s;
  const t = s.trim();
  const low = t.toLowerCase();
  if (low === "linear") return { type: "linear" };
  if (low in CSS_KEYWORDS) {
    const [x1, y1, x2, y2] = CSS_KEYWORDS[low as keyof typeof CSS_KEYWORDS];
    return { type: "cubic", x1, y1, x2, y2 };
  }
  const tok = low.match(/^--ease-(out|in|inout)$/);
  if (tok) {
    const [x1, y1, x2, y2] = tokenEasing[tok[1] as keyof typeof tokenEasing];
    return { type: "cubic", x1, y1, x2, y2 };
  }
  const st = low.match(/^spring\.(snappy|soft)$/);
  if (st) {
    const sp = tokenSpring[st[1] as keyof typeof tokenSpring];
    return { type: "spring", stiffness: sp.stiffness, damping: sp.damping, mass: sp.mass, velocity: 0 };
  }
  let m = low.match(/^cubic-bezier\(([^)]*)\)$/);
  if (m) {
    const n = m[1].split(",").map((v) => parseFloat(v));
    if (n.length !== 4 || n.some((v) => !Number.isFinite(v))) throw new Error(`cubic-bezier() takes four numbers: ${s}`);
    if (n[0] < 0 || n[0] > 1 || n[2] < 0 || n[2] > 1) throw new Error(`cubic-bezier() x values must be between 0 and 1: ${s}`);
    const [x1, y1, x2, y2] = n;
    return { type: "cubic", x1, y1, x2, y2 };
  }
  m = low.match(/^steps\(\s*(\d+)\s*(?:,\s*([a-z-]+))?\s*\)$/);
  if (m) return { type: "steps", steps: parseInt(m[1], 10), position: ((m[2] as StepPosition) ?? "jump-end") };
  m = low.match(/^spring\((.*)\)$/);
  if (m) {
    const body = m[1];
    const r = body.match(/response\s*=?\s*([\d.]+)/);
    const b = body.match(/bounce\s*=?\s*(-?[\d.]+)/);
    if (r) {
      const p = fromResponse(parseFloat(r[1]), b ? parseFloat(b[1]) : 0);
      return { type: "spring", ...p, velocity: 0 };
    }
    // spring(170 26 1), or labelled: spring(k 170, c 26, m 1) · spring(stiffness 170 damping 26)
    const named = (re: RegExp) => { const x = body.match(re); return x ? parseFloat(x[1]) : undefined; };
    const nums = body.split(/[\s,]+/).filter((v) => /^-?[\d.]+$/.test(v)).map(parseFloat);
    const labelled = /[a-z]/.test(body);
    const k = labelled ? named(/(?:stiffness|\bk)\s*=?\s*([\d.]+)/) : nums[0];
    const c = labelled ? named(/(?:damping|\bc)\s*=?\s*([\d.]+)/) : nums[1];
    const mass = (labelled ? named(/(?:mass|\bm)\s*=?\s*([\d.]+)/) : nums[2]) || 1;
    if (!(k! > 0) || !(c! >= 0)) throw new Error(`spring() needs a stiffness and a damping: ${s}`);
    return { type: "spring", stiffness: k!, damping: c!, mass, velocity: 0 };
  }
  if (low.startsWith("linear(")) return { type: "points", stops: parseLinear(t) };
  throw new Error(`Unknown easing shorthand: ${s}`);
}

export interface MoveInput {
  easing?: string | EasingSpec;
  duration?: number;
  delay?: number;
  from?: number;
  to?: number;
  property?: Property;
  target?: string;
}

export function toMove(i: MoveInput, fallback: Partial<Move> = {}): Move {
  return {
    target: i.target ?? fallback.target ?? "box",
    property: i.property ?? fallback.property ?? "x",
    from: i.from ?? fallback.from ?? 0,
    to: i.to ?? fallback.to ?? 240,
    duration: i.duration ?? fallback.duration ?? 280,
    delay: i.delay ?? fallback.delay ?? 0,
    easing: parseSpec(i.easing ?? fallback.easing),
  };
}

/** Describe an easing in words for captions and readouts. */
export function describeSpec(e: EasingSpec): string {
  switch (e.type) {
    case "cubic":
      return `cubic-bezier(${[e.x1, e.y1, e.x2, e.y2].map((n) => +n.toFixed(2)).join(", ")})`;
    case "spring":
      return `spring(k ${+e.stiffness.toFixed(0)}, c ${+e.damping.toFixed(1)}, m ${+e.mass.toFixed(1)})`;
    case "steps":
      return e.position === "jump-end" || e.position === "end" ? `steps(${e.steps})` : `steps(${e.steps}, ${e.position})`;
    case "points":
      return "linear(…)";
    default:
      return "linear";
  }
}

/** An easing spec as shorthand that parseSpec reads back exactly (for inputs prefilled with a spec). */
export function specToString(e: EasingSpec): string {
  const n = (v: number) => String(+v.toFixed(3));
  switch (e.type) {
    case "cubic":
      return `cubic-bezier(${[e.x1, e.y1, e.x2, e.y2].map(n).join(", ")})`;
    case "spring":
      return `spring(${+e.stiffness.toFixed(2)} ${+e.damping.toFixed(2)} ${+e.mass.toFixed(2)})`;
    case "steps":
      return `steps(${e.steps}, ${e.position})`;
    case "points":
      return formatLinear(e.stops);
    default:
      return "linear";
  }
}

/** An easing spec as WAAPI timing: springs become linear() over their own settle time. */
export function waapiTiming(e: EasingSpec, duration: number): { easing: string; duration: number } {
  switch (e.type) {
    case "cubic":
      return { easing: `cubic-bezier(${e.x1}, ${e.y1}, ${e.x2}, ${e.y2})`, duration };
    case "spring": {
      const s = springToLinear(e, { velocity: e.velocity });
      return { easing: s.easing, duration: s.duration };
    }
    case "steps":
      return { easing: `steps(${e.steps}, ${e.position})`, duration };
    case "points":
      return { easing: formatLinear(e.stops), duration };
    default:
      return { easing: "linear", duration };
  }
}
