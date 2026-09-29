import type { DrillDef } from "./types";
import type { StateId } from "~/lib/datastage";

export type Lie = "overshoot" | "index" | "baseline";

export const LIES: Record<Lie, { name: string; why: string }> = {
  overshoot: { name: "Overshoot", why: "The bars bounce past their values. For a moment the chart shows numbers that are not in the data." },
  index: { name: "Identity swap", why: "Bars are matched by position, not by datum: each bar morphs into a different product. Follow one and it becomes someone else." },
  baseline: { name: "Truncated axis", why: "The axis quietly stops starting at zero during the move, so small differences suddenly look huge." },
};

export interface LiesSpec {
  from: StateId;
  to: StateId;
  lie: Lie;
  /** Which side (0 = A) lies. */
  liar: 0 | 1;
}

const PAIRS: [StateId, StateId][] = [
  ["a-z", "by-value"],
  ["by-value", "2024"],
  ["2024", "grouped"],
  ["a-z", "2024"],
  ["by-value", "north"],
];

/** Two chart transitions of the same data. Pick the one that distorts. */
export const transitionLies: DrillDef<LiesSpec, number> = {
  id: "transition-lies",
  name: "Which Transition Lies?",
  prompt: "Same data, same change. Which transition distorts it?",
  trains: "Honesty: motion must not distort magnitude or identity",
  unlocksAfter: 23,
  kind: "choice",
  make(rand) {
    const [from, to] = PAIRS[Math.floor(rand() * PAIRS.length)];
    const lies: Lie[] = ["overshoot", "index", "baseline"];
    // Identity swaps only show when the order changes.
    const pool = to === "2024" && from === "by-value" ? lies.filter((l) => l !== "index") : lies;
    return { from, to, lie: pool[Math.floor(rand() * pool.length)], liar: rand() < 0.5 ? 0 : 1 };
  },
  score(spec, answer) {
    const ok = answer === spec.liar;
    const L = LIES[spec.lie];
    return {
      correct: ok,
      points: ok ? 100 : 0,
      truth: spec.liar,
      answer,
      verdict: `${ok ? "Yes" : `${spec.liar === 0 ? "A" : "B"} lied`}: ${L.name.toLowerCase()}. ${L.why}`,
      meta: { lie: spec.lie },
    };
  },
};
