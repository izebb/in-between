// Drill id → trial component. Each trial takes { spec, result, onanswer }.
import type { DrillId } from "~/lib/curriculum";
import GuessDurationTrial from "./GuessDurationTrial.svelte";
import MatchCurveTrial from "./MatchCurveTrial.svelte";
import WhatItSaysTrial from "./WhatItSaysTrial.svelte";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trialComponents: Partial<Record<DrillId, any>> = {
  "guess-duration": GuessDurationTrial,
  "match-curve": MatchCurveTrial,
  "what-it-says": WhatItSaysTrial,
};
