// Drill id → trial component. Each trial takes { spec, result, onanswer }.
import type { DrillId } from "~/lib/curriculum";
import GuessDurationTrial from "./GuessDurationTrial.svelte";
import MatchCurveTrial from "./MatchCurveTrial.svelte";
import WhatItSaysTrial from "./WhatItSaysTrial.svelte";
import WhichHeavierTrial from "./WhichHeavierTrial.svelte";
import TuneToMatchTrial from "./TuneToMatchTrial.svelte";
import BlindABTrial from "./BlindABTrial.svelte";
import SpotPrincipleTrial from "./SpotPrincipleTrial.svelte";
import FixFeelingTrial from "./FixFeelingTrial.svelte";
import TransitionLiesTrial from "./TransitionLiesTrial.svelte";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trialComponents: Partial<Record<DrillId, any>> = {
  "guess-duration": GuessDurationTrial,
  "match-curve": MatchCurveTrial,
  "what-it-says": WhatItSaysTrial,
  "which-heavier": WhichHeavierTrial,
  "tune-to-match": TuneToMatchTrial,
  "blind-ab": BlindABTrial,
  "spot-principle": SpotPrincipleTrial,
  "fix-feeling": FixFeelingTrial,
  "transition-lies": TransitionLiesTrial,
};
