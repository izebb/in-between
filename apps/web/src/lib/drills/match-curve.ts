import type { DrillDef } from "./types";
import { pick, shuffle } from "./types";

export interface MatchCurveSpec {
  duration: number;
  options: { id: string; label: string; easing: string }[];
  correct: number;
}

const EASY = [
  { id: "linear", label: "linear", easing: "linear" },
  { id: "ease-in", label: "ease-in", easing: "cubic-bezier(.55,0,1,.45)" },
  { id: "ease-out", label: "ease-out", easing: "cubic-bezier(0,.55,.45,1)" },
  { id: "ease-in-out", label: "ease-in-out", easing: "cubic-bezier(.65,0,.35,1)" },
];
const HARD = [
  ...EASY,
  { id: "back-out", label: "overshoot", easing: "cubic-bezier(.34,1.56,.64,1)" },
  { id: "spring", label: "spring", easing: "spring(response .5 bounce .35)" },
  { id: "steps", label: "steps(5)", easing: "steps(5)" },
  { id: "anticipate", label: "anticipate", easing: "cubic-bezier(.6,-.5,.7,1)" },
  { id: "expo-out", label: "expo-out", easing: "cubic-bezier(.16,1,.3,1)" },
];

/** Watch a motion, pick its curve from four. */
export const matchCurve: DrillDef<MatchCurveSpec, number> = {
  id: "match-curve",
  name: "Match the curve",
  prompt: "Which curve made that motion?",
  trains: "Spacing: reading a curve as speed",
  unlocksAfter: 3,
  kind: "choice",
  make(rand, level) {
    const pool = level < 2 ? EASY : HARD;
    const options = shuffle(rand, pool).slice(0, 4);
    const correct = Math.floor(rand() * options.length);
    return { duration: pick(rand, [700, 800, 900]), options, correct };
  },
  score(spec, answer) {
    const ok = answer === spec.correct;
    return {
      correct: ok,
      points: ok ? 100 : 0,
      truth: spec.correct,
      answer,
      verdict: ok
        ? `Yes: ${spec.options[spec.correct].label}.`
        : `It was ${spec.options[spec.correct].label}, not ${spec.options[answer].label}. Compare their spacing below.`,
      meta: { truthId: spec.options[spec.correct].id, answerId: spec.options[answer].id },
    };
  },
};
