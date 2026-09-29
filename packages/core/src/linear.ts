/**
 * CSS `linear()`: a piecewise-linear timing function.
 *
 * `linear(0, 0.25 10%, 1)` means: progress 0 at 0% time, 0.25 at 10%, 1 at 100%.
 * Any curve (a spring, a bounce, a hand-drawn ease) can be sampled into one.
 * We sample densely, then drop the points that a straight line already explains
 * (Ramer–Douglas–Peucker), so the string stays short.
 */

import type { EasingFn } from "./bezier.ts";

export interface LinearStop {
  input: number; // 0..1 time
  output: number; // progress (may overshoot)
}

/** Parse the argument list of `linear(...)` into explicit stops (CSS Easing Level 2 rules). */
export function parseLinear(source: string): LinearStop[] {
  const inner = source
    .trim()
    .replace(/^linear\(/i, "")
    .replace(/\)$/, "");
  const raw: { output: number; input: number | null }[] = [];
  for (const part of inner.split(",")) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    if (!tokens.length) continue;
    const output = parseFloat(tokens[0]);
    const pcts = tokens.slice(1).map((t) => parseFloat(t) / 100);
    if (pcts.length === 0) raw.push({ output, input: null });
    else for (const p of pcts) raw.push({ output, input: p });
  }
  if (!raw.length) return [];
  if (raw[0].input === null) raw[0].input = 0;
  if (raw.length > 1 && raw[raw.length - 1].input === null) raw[raw.length - 1].input = 1;
  // Inputs never go backwards.
  let max = -Infinity;
  for (const s of raw) {
    if (s.input !== null) {
      s.input = Math.max(s.input, max);
      max = s.input;
    }
  }
  // Runs of missing inputs are spread evenly between their known neighbours.
  for (let i = 0; i < raw.length; i++) {
    if (raw[i].input !== null) continue;
    let j = i;
    while (raw[j].input === null) j++;
    const a = raw[i - 1].input as number;
    const b = raw[j].input as number;
    const n = j - i + 1;
    for (let k = i; k < j; k++) raw[k].input = a + ((b - a) * (k - i + 1)) / n;
    i = j;
  }
  return raw.map((s) => ({ input: s.input as number, output: s.output }));
}

export function linearEasing(stops: LinearStop[]): EasingFn {
  if (stops.length === 0) return (x) => x;
  if (stops.length === 1) return () => stops[0].output;
  return (x: number) => {
    if (x <= stops[0].input) return stops[0].output;
    const last = stops[stops.length - 1];
    if (x >= last.input) return last.output;
    // The last stop whose input <= x, per spec (handles repeated inputs as jumps).
    let i = 0;
    while (i < stops.length - 2 && stops[i + 1].input <= x) i++;
    const a = stops[i];
    const b = stops[i + 1];
    if (b.input === a.input) return b.output;
    return a.output + ((b.output - a.output) * (x - a.input)) / (b.input - a.input);
  };
}

function perpendicularDistance(p: LinearStop, a: LinearStop, b: LinearStop): number {
  // Vertical distance: what matters is progress error at a given time.
  if (b.input === a.input) return Math.abs(p.output - a.output);
  const y = a.output + ((b.output - a.output) * (p.input - a.input)) / (b.input - a.input);
  return Math.abs(p.output - y);
}

function simplify(points: LinearStop[], tolerance: number): LinearStop[] {
  if (points.length <= 2) return points.slice();
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop() as [number, number];
    let maxD = 0;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = perpendicularDistance(points[i], points[s], points[e]);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx !== -1 && maxD > tolerance) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

export interface ToLinearOptions {
  /** Dense samples taken before simplification. */
  samples?: number;
  /** Max progress error allowed after simplification (0.002 ≈ 0.5px on a 250px move). */
  tolerance?: number;
  /** Decimals for output values. */
  precision?: number;
}

function fmt(n: number, precision: number): string {
  const s = n.toFixed(precision);
  return s.includes(".") ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
}

/** Sample an easing function into simplified linear() stops. */
export function toLinearStops(fn: EasingFn, opts: ToLinearOptions = {}): LinearStop[] {
  const samples = opts.samples ?? 300;
  const tolerance = opts.tolerance ?? 0.002;
  const pts: LinearStop[] = [];
  for (let i = 0; i <= samples; i++) {
    const x = i / samples;
    pts.push({ input: x, output: fn(x) });
  }
  return simplify(pts, tolerance);
}

/** Format stops as a CSS `linear()` string. */
export function formatLinear(stops: LinearStop[], precision = 4): string {
  const parts = stops.map((s, i) => {
    const out = fmt(s.output, precision);
    const implicit = (i === 0 && s.input === 0) || (i === stops.length - 1 && s.input === 1);
    return implicit ? out : `${out} ${fmt(s.input * 100, 2)}%`;
  });
  return `linear(${parts.join(", ")})`;
}

/** Any easing function → a CSS `linear()` string. */
export function toLinear(fn: EasingFn, opts: ToLinearOptions = {}): string {
  return formatLinear(toLinearStops(fn, opts), opts.precision ?? 4);
}
