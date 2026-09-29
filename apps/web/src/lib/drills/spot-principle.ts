import type { DrillDef } from "./types";
import { shuffle } from "./types";
import { PRINCIPLES } from "~/lib/principles";

export interface SpotSpec {
  id: string;
  options: string[];
}

/** A clip from a UI. Name the principle. */
export const spotPrinciple: DrillDef<SpotSpec, number> = {
  id: "spot-principle",
  name: "Spot the Principle",
  prompt: "Which principle is this clip showing?",
  trains: "The twelve principles, recognised in UI",
  unlocksAfter: 7,
  kind: "choice",
  make(rand) {
    const p = PRINCIPLES[Math.floor(rand() * PRINCIPLES.length)];
    const others = shuffle(rand, PRINCIPLES.filter((x) => x.id !== p.id)).slice(0, 3).map((x) => x.id);
    return { id: p.id, options: shuffle(rand, [p.id, ...others]) };
  },
  score(spec, answer) {
    const ok = spec.options[answer] === spec.id;
    const p = PRINCIPLES.find((x) => x.id === spec.id)!;
    return {
      correct: ok,
      points: ok ? 100 : 0,
      truth: spec.options.indexOf(spec.id),
      answer,
      verdict: `${ok ? "Yes" : `It's ${p.name}`}. ${p.why}`,
      meta: { principle: spec.id },
    };
  },
};
