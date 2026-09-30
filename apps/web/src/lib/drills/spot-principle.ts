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
  name: "Spot the principle",
  prompt: "Which principle is this clip showing?",
  trains: "The twelve principles, recognised in UI",
  unlocksAfter: 7,
  kind: "choice",
  make(rand) {
    const p = PRINCIPLES[Math.floor(rand() * PRINCIPLES.length)];
    const others = shuffle(rand, PRINCIPLES.filter((x) => x.id !== p.id)).slice(0, 3).map((x) => x.id);
    return { id: p.id, options: shuffle(rand, [p.id, ...others]) };
  },
  key: (spec) => spec.id,
  score(spec, answer) {
    const ok = spec.options[answer] === spec.id;
    const p = PRINCIPLES.find((x) => x.id === spec.id)!;
    const chosen = PRINCIPLES.find((x) => x.id === spec.options[answer]);
    return {
      correct: ok,
      points: ok ? 100 : 0,
      truth: spec.options.indexOf(spec.id),
      answer,
      verdict: `${ok ? `Yes, ${p.name}` : `It's ${p.name} (${p.ui.toLowerCase()}), not ${chosen?.name ?? "that"}`}. ${p.why} (Chapter 7.)`,
      meta: { principle: spec.id },
    };
  },
};
