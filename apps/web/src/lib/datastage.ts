/**
 * Data Stage: a small dataset, the states a chart moves between, and the geometry of every
 * mark at any moment of a transition. Used by L10, the chapter 23 figures, and the
 * "Which transition lies?" drill.
 *
 * The data is invented for teaching: twelve products, two years, three groups.
 */

import { scaleBand, scaleLinear } from "d3-scale";
import { interpolateNumber } from "d3-interpolate";
import { easingFn, type EasingSpec } from "@inbetween/core";

export interface Datum {
  id: string;
  name: string;
  group: "North" | "South" | "West";
  y2023: number;
  y2024: number;
}

export const DATA: Datum[] = [
  { id: "a", name: "Alder", group: "North", y2023: 42, y2024: 58 },
  { id: "b", name: "Birch", group: "South", y2023: 67, y2024: 51 },
  { id: "c", name: "Cedar", group: "West", y2023: 23, y2024: 39 },
  { id: "d", name: "Dogwood", group: "North", y2023: 81, y2024: 74 },
  { id: "e", name: "Elm", group: "West", y2023: 35, y2024: 62 },
  { id: "f", name: "Fir", group: "South", y2023: 55, y2024: 47 },
  { id: "g", name: "Ginkgo", group: "North", y2023: 18, y2024: 26 },
  { id: "h", name: "Hazel", group: "West", y2023: 60, y2024: 88 },
  { id: "i", name: "Ironwood", group: "South", y2023: 29, y2024: 21 },
  { id: "j", name: "Juniper", group: "North", y2023: 47, y2024: 44 },
  { id: "k", name: "Kauri", group: "West", y2023: 72, y2024: 66 },
  { id: "l", name: "Larch", group: "South", y2023: 38, y2024: 55 },
];

export type StateId = "a-z" | "by-value" | "2024" | "north" | "grouped";

export interface ChartState {
  id: StateId;
  label: string;
  year: 2023 | 2024;
  filter: Datum["group"] | null;
  order: "name" | "value" | "group";
}

export const STATES: ChartState[] = [
  { id: "a-z", label: "A–Z", year: 2023, filter: null, order: "name" },
  { id: "by-value", label: "Sorted", year: 2023, filter: null, order: "value" },
  { id: "2024", label: "2024", year: 2024, filter: null, order: "value" },
  { id: "north", label: "North only", year: 2024, filter: "North", order: "value" },
  { id: "grouped", label: "By group", year: 2024, filter: null, order: "group" },
];

export interface Mark {
  id: string;
  name: string;
  x: number;
  w: number;
  /** Bar top (y of the value). */
  y: number;
  h: number;
  value: number;
  opacity: number;
  /** Stable key for rendering: during a transition it names the pair, because with index keying the id flips mid-move. */
  key?: string;
}

export interface Layout {
  marks: Map<string, Mark>;
  order: string[];
  max: number;
}

export interface Frame {
  width: number;
  height: number;
  padL: number;
  padB: number;
  padT: number;
}

export const valueOf = (d: Datum, year: 2023 | 2024) => (year === 2023 ? d.y2023 : d.y2024);

/** Where every visible bar sits in a state. */
export function layout(state: ChartState, f: Frame, fixedMax?: number, axisMin = 0): Layout {
  let rows = DATA.filter((d) => !state.filter || d.group === state.filter);
  if (state.order === "name") rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));
  if (state.order === "value") rows = [...rows].sort((a, b) => valueOf(b, state.year) - valueOf(a, state.year));
  if (state.order === "group")
    rows = [...rows].sort((a, b) => a.group.localeCompare(b.group) || valueOf(b, state.year) - valueOf(a, state.year));
  const slots: (string | null)[] = [];
  rows.forEach((d, i) => {
    if (state.order === "group" && i > 0 && rows[i - 1].group !== d.group) slots.push(null); // a gap between groups
    slots.push(d.id);
  });
  const x = scaleBand<number>()
    .domain(slots.map((_, i) => i))
    .range([f.padL, f.width - 8])
    .padding(0.22);
  const max = fixedMax ?? Math.max(...DATA.map((d) => Math.max(d.y2023, d.y2024)));
  // A non-zero axisMin truncates the axis: small differences look large. (The "lies" drill uses it.)
  const y = scaleLinear().domain([axisMin, max]).range([f.height - f.padB, f.padT]).clamp(true);
  const marks = new Map<string, Mark>();
  slots.forEach((id, i) => {
    if (!id) return;
    const d = DATA.find((r) => r.id === id)!;
    const v = valueOf(d, state.year);
    marks.set(id, { id, name: d.name, x: x(i)!, w: x.bandwidth(), y: y(v), h: y(0) - y(v), value: v, opacity: 1 });
  });
  return { marks, order: rows.map((r) => r.id), max };
}

export interface TransitionOptions {
  duration: number;
  /** ms between consecutive marks. */
  stagger: number;
  easing: EasingSpec;
  /** "data": marks keep their identity. "index": mark i morphs into whatever is i next (identity lost). */
  keying: "data" | "index";
  /** "together": everything at once. "staged": exits, then moves, then enters. */
  staging: "together" | "staged";
}

export interface Transition {
  total: number;
  /** Marks at time t (ms). */
  at(t: number): Mark[];
}

const lerpMark = (a: Mark, b: Mark, p: number): Mark => ({
  // With index keying the identity flips halfway: a tracked bar jumps to another datum.
  id: p < 0.5 ? a.id : b.id,
  name: p < 0.5 ? a.name : b.name,
  x: interpolateNumber(a.x, b.x)(p),
  w: interpolateNumber(a.w, b.w)(p),
  y: interpolateNumber(a.y, b.y)(p),
  h: interpolateNumber(a.h, b.h)(p),
  value: interpolateNumber(a.value, b.value)(p),
  opacity: interpolateNumber(a.opacity, b.opacity)(p),
});

export function transition(from: Layout, to: Layout, f: Frame, o: TransitionOptions): Transition {
  const ease = easingFn(o.easing).ease;
  const baseY = f.height - f.padB;
  const flat = (m: Mark): Mark => ({ ...m, y: baseY, h: 0, opacity: 0 });

  // Pair up marks: by id (object constancy) or by position (what naive code does).
  type Pair = { a: Mark; b: Mark; kind: "move" | "enter" | "exit"; rank: number };
  const pairs: Pair[] = [];
  if (o.keying === "data") {
    const ids = new Set([...from.marks.keys(), ...to.marks.keys()]);
    for (const id of ids) {
      const a = from.marks.get(id);
      const b = to.marks.get(id);
      if (a && b) pairs.push({ a, b, kind: "move", rank: to.order.indexOf(id) });
      else if (b) pairs.push({ a: flat(b), b, kind: "enter", rank: to.order.indexOf(id) });
      else if (a) pairs.push({ a, b: flat(a), kind: "exit", rank: from.order.indexOf(id) });
    }
  } else {
    const n = Math.max(from.order.length, to.order.length);
    for (let i = 0; i < n; i++) {
      const a = from.marks.get(from.order[i]);
      const b = to.marks.get(to.order[i]);
      if (a && b) pairs.push({ a, b, kind: "move", rank: i });
      else if (b) pairs.push({ a: flat(b), b, kind: "enter", rank: i });
      else if (a) pairs.push({ a, b: flat(a), kind: "exit", rank: i });
    }
  }

  const n = Math.max(1, ...pairs.map((p) => p.rank + 1));
  const span = o.duration + o.stagger * (n - 1);
  const exitD = o.staging === "staged" ? Math.round(o.duration * 0.6) : 0;
  const enterStart = o.staging === "staged" ? exitD + span : 0;
  const total = o.staging === "staged" ? exitD + span + Math.round(o.duration * 0.8) : span;

  return {
    total,
    at(t: number) {
      return pairs.map((p, k) => {
        let start: number;
        let dur = o.duration;
        if (o.staging === "staged") {
          if (p.kind === "exit") {
            start = 0;
            dur = exitD;
          } else if (p.kind === "enter") {
            start = enterStart;
            dur = Math.round(o.duration * 0.8);
          } else start = exitD + p.rank * o.stagger;
        } else start = p.rank * o.stagger;
        const local = Math.min(1, Math.max(0, (t - start) / dur));
        const eased = p.kind === "move" ? ease(local) : local < 1 ? ease(local) : 1;
        return { ...lerpMark(p.a, p.b, eased), key: `p${k}` };
      });
    },
  };
}
