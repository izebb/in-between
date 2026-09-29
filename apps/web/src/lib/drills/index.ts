import type { DrillDef } from "./types";
import type { DrillId } from "~/lib/curriculum";
import { guessDuration } from "./guess-duration";
import { matchCurve } from "./match-curve";
import { whatItSays } from "./what-it-says";

export const drills: Partial<Record<DrillId, DrillDef<any, any>>> = {
  "guess-duration": guessDuration,
  "match-curve": matchCurve,
  "what-it-says": whatItSays,
};

export const drillOrder: DrillId[] = [
  "what-it-says",
  "guess-duration",
  "match-curve",
  "which-heavier",
  "tune-to-match",
  "spot-principle",
  "fix-feeling",
  "transition-lies",
  "blind-ab",
];

/** Display names, including drills whose trials are still being built. */
export const drillNames: Record<DrillId, string> = {
  "what-it-says": "What Does It Say?",
  "guess-duration": "Guess the Duration",
  "match-curve": "Match the Curve",
  "which-heavier": "Which Is Heavier?",
  "tune-to-match": "Tune to Match",
  "spot-principle": "Spot the Principle",
  "fix-feeling": "Fix the Feeling",
  "transition-lies": "Which Transition Lies?",
  "blind-ab": "Blind A/B",
};
