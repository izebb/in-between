import type { DrillDef } from "./types";
import type { MockKind, MockMotion } from "~/components/figures/Mock.svelte";

export const MEANINGS = ["causality", "continuity", "attention", "feedback", "state"] as const;
export type Meaning = (typeof MEANINGS)[number];

export interface Clip {
  kind: MockKind;
  motion: MockMotion;
  direction?: "enter" | "exit" | "loop";
  says: Meaning;
  why: string;
}

export const CLIPS: Clip[] = [
  { kind: "swap", motion: { easing: "--ease-inout", duration: 520 }, says: "continuity", why: "The item travels between lists instead of vanishing and reappearing. Same thing, new place." },
  { kind: "expand", motion: { easing: "--ease-out", duration: 480 }, says: "continuity", why: "The thumbnail grows into the panel: the detail view is that tile, not a new screen." },
  { kind: "tabs", motion: { easing: "--ease-inout", duration: 300 }, says: "continuity", why: "One underline slides between tabs. It's a single indicator that moved, not two." },
  { kind: "menu", motion: { easing: "--ease-out", duration: 200 }, says: "causality", why: "The menu grows out of the button: that press made this appear." },
  { kind: "toggle", motion: { easing: "spring.snappy" }, says: "state", why: "The knob moves to the other side and the track fills: the setting is now on." },
  { kind: "modal", motion: { easing: "--ease-out", duration: 280 }, says: "state", why: "The page dims behind the dialog: you're in a different mode until you answer it." },
  { kind: "like", motion: { easing: "--ease-out", duration: 360 }, says: "feedback", why: "The heart squashes and pops back: your tap was received." },
  { kind: "progress", motion: { easing: "--ease-inout", duration: 1400 }, says: "feedback", why: "The bar fills as work happens: the system is answering your request." },
  { kind: "badge", motion: { easing: "spring(response .35 bounce .45)" }, says: "attention", why: "A count pops onto the bell: something new wants a look." },
  { kind: "card", motion: { easing: "--ease-out", duration: 420, distance: 24 }, says: "attention", why: "A new card rises into place: look here, this is new." },
];

export interface WhatItSaysSpec {
  clip: Clip;
  options: Meaning[];
}

/** Name what the motion says. */
export const whatItSays: DrillDef<WhatItSaysSpec, number> = {
  id: "what-it-says",
  name: "What does it say?",
  prompt: "What does this motion tell you?",
  trains: "Motion as information",
  unlocksAfter: 1,
  kind: "choice",
  make(rand) {
    const clip = CLIPS[Math.floor(rand() * CLIPS.length)];
    return { clip, options: [...MEANINGS] };
  },
  key: (spec) => spec.clip.kind,
  score(spec, answer) {
    const ok = spec.options[answer] === spec.clip.says;
    return {
      correct: ok,
      points: ok ? 100 : 0,
      truth: MEANINGS.indexOf(spec.clip.says),
      answer,
      verdict: `${ok ? "Yes" : `It says ${spec.clip.says}`}. ${spec.clip.why}`,
      meta: { clip: spec.clip.kind },
    };
  },
};
