import type { DrillDef } from "./types";
import type { DrillId } from "~/lib/curriculum";
import type { DrillSession } from "~/lib/store";
import { guessDuration } from "./guess-duration";
import { matchCurve } from "./match-curve";
import { whatItSays } from "./what-it-says";
import { whichHeavier } from "./which-heavier";
import { tuneToMatch } from "./tune-to-match";
import { blindAB } from "./blind-ab";
import { spotPrinciple } from "./spot-principle";
import { fixFeeling } from "./fix-feeling";
import { transitionLies } from "./transition-lies";

export const drills: Partial<Record<DrillId, DrillDef<any, any>>> = {
  "guess-duration": guessDuration,
  "match-curve": matchCurve,
  "what-it-says": whatItSays,
  "which-heavier": whichHeavier,
  "tune-to-match": tuneToMatch,
  "blind-ab": blindAB,
  "spot-principle": spotPrinciple,
  "fix-feeling": fixFeeling,
  "transition-lies": transitionLies,
};

/** In the order of the chapters they follow; Blind A/B follows none, so it comes first. */
export const drillOrder: DrillId[] = [
  "blind-ab",
  "what-it-says",
  "guess-duration",
  "match-curve",
  "which-heavier",
  "tune-to-match",
  "spot-principle",
  "fix-feeling",
  "transition-lies",
];

/** Display names, including drills whose trials are still being built. */
export const drillNames: Record<DrillId, string> = {
  "what-it-says": "What does it say?",
  "guess-duration": "Guess the duration",
  "match-curve": "Match the curve",
  "which-heavier": "Which is heavier?",
  "tune-to-match": "Tune to match",
  "spot-principle": "Spot the principle",
  "fix-feeling": "Fix the feeling",
  "transition-lies": "Which transition lies?",
  "blind-ab": "Blind A/B",
};

/** A round as one number, as the calibration's trend line draws it: the mean error in % (estimate
 *  drills), or the share answered right in % (choice drills). */
export function sessionMeasure(kind: DrillDef["kind"], s: DrillSession): number {
  const n = s.trials.length;
  if (!n) return 0;
  if (kind === "estimate") return (s.trials.reduce((sum, t) => sum + Math.abs(t.answer - t.truth) / Math.max(1, t.truth), 0) / n) * 100;
  return (s.trials.filter((t) => t.correct).length / n) * 100;
}
