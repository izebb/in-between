/**
 * Named easings, `steps()`, and a parser for any CSS <easing-function>.
 */

import { cubicBezier, type EasingFn } from "./bezier.ts";
import { linearEasing, parseLinear } from "./linear.ts";

/** CSS keyword curves, exactly as the spec defines them. */
export const CSS_KEYWORDS = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;

export type CssKeyword = keyof typeof CSS_KEYWORDS;

export const linear: EasingFn = (x) => x;
export const ease = cubicBezier(...CSS_KEYWORDS.ease);
export const easeIn = cubicBezier(...CSS_KEYWORDS["ease-in"]);
export const easeOut = cubicBezier(...CSS_KEYWORDS["ease-out"]);
export const easeInOut = cubicBezier(...CSS_KEYWORDS["ease-in-out"]);

export type StepPosition = "jump-start" | "jump-end" | "jump-none" | "jump-both" | "start" | "end";

/** CSS `steps(n, position)`: time held, then jumped. */
export function steps(n: number, position: StepPosition = "jump-end"): EasingFn {
  const pos = position === "start" ? "jump-start" : position === "end" ? "jump-end" : position;
  const jumps = pos === "jump-none" ? n - 1 : pos === "jump-both" ? n + 1 : n;
  return (x: number) => {
    let step = Math.floor(x * n);
    if (pos === "jump-start" || pos === "jump-both") step += 1;
    if (x >= 0 && step < 0) step = 0;
    if (x <= 1 && step > jumps) step = jumps;
    return jumps <= 0 ? 0 : step / jumps;
  };
}

/** Power curves: the hand-written family from chapter 15. */
export const power = {
  in: (p: number): EasingFn => (x) => Math.pow(x, p),
  out: (p: number): EasingFn => (x) => 1 - Math.pow(1 - x, p),
  inOut: (p: number): EasingFn => (x) =>
    x < 0.5 ? Math.pow(2 * x, p) / 2 : 1 - Math.pow(2 - 2 * x, p) / 2,
};

/** Turn an ease-in into its mirror (ease-out), or build in-out from any in. */
export const reverseEasing = (fn: EasingFn): EasingFn => (x) => 1 - fn(1 - x);
export const mirrorEasing = (fn: EasingFn): EasingFn => (x) =>
  x < 0.5 ? fn(2 * x) / 2 : 1 - fn(2 - 2 * x) / 2;

/** Parse any CSS easing string into a function. Throws on nonsense. */
export function parseEasing(css: string): EasingFn {
  const s = css.trim().toLowerCase();
  if (s in CSS_KEYWORDS) {
    if (s === "linear") return linear;
    const k = CSS_KEYWORDS[s as CssKeyword];
    return cubicBezier(k[0], k[1], k[2], k[3]);
  }
  if (s === "step-start") return steps(1, "jump-start");
  if (s === "step-end") return steps(1, "jump-end");
  let m = s.match(/^cubic-bezier\(([^)]*)\)$/);
  if (m) {
    const n = m[1].split(",").map((v) => parseFloat(v));
    if (n.length !== 4 || n.some((v) => !Number.isFinite(v))) throw new Error(`Bad cubic-bezier: ${css}`);
    if (n[0] < 0 || n[0] > 1 || n[2] < 0 || n[2] > 1) throw new Error(`x values must be in [0, 1]: ${css}`);
    return cubicBezier(n[0], n[1], n[2], n[3]);
  }
  m = s.match(/^steps\(\s*(\d+)\s*(?:,\s*([a-z-]+)\s*)?\)$/);
  if (m) return steps(parseInt(m[1], 10), (m[2] as StepPosition) ?? "jump-end");
  if (s.startsWith("linear(")) return linearEasing(parseLinear(s));
  throw new Error(`Unknown easing: ${css}`);
}

/** Format four control points as a CSS cubic-bezier() string. */
export function formatCubicBezier(p: readonly number[], precision = 3): string {
  const f = (n: number) => {
    const r = Number(n.toFixed(precision));
    return String(r);
  };
  return `cubic-bezier(${p.map(f).join(", ")})`;
}
