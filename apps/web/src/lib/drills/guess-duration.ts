import type { DrillDef } from "./types";
import { pick } from "./types";
import type { MockKind } from "~/components/figures/Mock.svelte";

export interface GuessDurationSpec {
  duration: number;
  easing: string;
  kind: MockKind;
}

/** Watch a move. Estimate its milliseconds. Score = error. */
export const guessDuration: DrillDef<GuessDurationSpec, number> = {
  id: "guess-duration",
  name: "Guess the duration",
  prompt: "Watch the move. How long did it take?",
  trains: "Timing: seeing 200ms as 200ms",
  unlocksAfter: 2,
  kind: "estimate",
  unit: "ms",
  quantity: "duration",
  make(rand, level) {
    // Early levels spread durations wide; later ones sit in the tricky middle band.
    const lo = level < 3 ? 80 : 150;
    const hi = level < 3 ? 1200 : 700;
    const raw = lo + rand() * (hi - lo);
    const duration = Math.round(raw / 10) * 10;
    return {
      duration,
      easing: pick(rand, ["--ease-out", "ease-in-out", "--ease-out", "linear"]),
      kind: pick(rand, ["dot", "card", "toast", "dot", "drawer"] as MockKind[]),
    };
  },
  score(spec, answer) {
    const err = Math.abs(answer - spec.duration);
    const rel = err / spec.duration;
    const points = Math.round(100 * Math.max(0, 1 - rel));
    const correct = rel <= 0.25;
    const frames = Math.round((spec.duration / 1000) * 60);
    const off = err === 0 ? "exactly right" : `${answer > spec.duration ? "over" : "under"} by ${err}ms, ${Math.round(rel * 100)}%`;
    return {
      correct,
      points,
      truth: spec.duration,
      answer,
      verdict: `It took ${spec.duration}ms (${frames} frames at 60fps). You said ${answer}ms: ${off}. Try counting frames at 60 a second: 200ms is 12 (chapter 2).`,
    };
  },
};
