import type { DrillDef } from "./types";
import { fromResponse, spring } from "@inbetween/core";

export interface TuneSpec {
  response: number;
  bounce: number;
}
export interface TuneAnswer {
  response: number;
  bounce: number;
}

/** Root-mean-square gap between two springs' paths, over the slower one's settle time. */
export function springGap(a: TuneSpec, b: TuneSpec): number {
  const sa = spring(fromResponse(a.response, a.bounce));
  const sb = spring(fromResponse(b.response, b.bounce));
  const T = Math.max(sa.settleTime(), sb.settleTime(), 0.2);
  let sum = 0;
  const n = 200;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * T;
    sum += (sa.position(t) - sb.position(t)) ** 2;
  }
  return Math.sqrt(sum / (n + 1));
}

/** A target spring plays. Match it with two knobs. */
export const tuneToMatch: DrillDef<TuneSpec, TuneAnswer> = {
  id: "tune-to-match",
  name: "Tune to Match",
  prompt: "Match the blue spring with your red one. Use your eyes, then submit.",
  trains: "Springs: response and bounce as feel",
  unlocksAfter: 5,
  kind: "estimate",
  unit: "ms",
  make(rand, level) {
    const response = +(0.25 + rand() * (level < 2 ? 0.6 : 0.45)).toFixed(2);
    const bounce = +(level < 2 ? rand() * 0.55 : -0.2 + rand() * 0.7).toFixed(2);
    return { response, bounce };
  },
  score(spec, a) {
    const gap = springGap(spec, a);
    const points = Math.round(100 * Math.max(0, 1 - gap / 0.12));
    return {
      correct: gap < 0.035,
      points,
      truth: Math.round(spec.response * 1000),
      answer: Math.round(a.response * 1000),
      verdict: `Target: response ${spec.response.toFixed(2)}s, bounce ${spec.bounce.toFixed(2)}. Yours: ${a.response.toFixed(2)}s, ${a.bounce.toFixed(2)}. Paths differ by ${(gap * 100).toFixed(1)}% on average.`,
      meta: { truthBounce: spec.bounce, answerBounce: a.bounce, gap },
    };
  },
};
