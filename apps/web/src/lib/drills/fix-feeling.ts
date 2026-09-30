import type { DrillDef } from "./types";
import type { MockKind, MockMotion } from "~/components/figures/Mock.svelte";

export type Knob = "duration" | "easing" | "distance" | "stagger";

export const EASINGS = [
  { id: "linear", label: "linear" },
  { id: "--ease-out", label: "ease-out" },
  { id: "--ease-in", label: "ease-in" },
  { id: "ease-in-out", label: "ease-in-out" },
  { id: "spring.snappy", label: "spring · snappy" },
  { id: "spring(response .45 bounce .55)", label: "spring · bouncy" },
] as const;

export interface FixCase {
  kind: MockKind;
  direction?: "enter" | "exit" | "loop";
  broken: MockMotion;
  word: string;
  culprit: Knob;
  /** Is this motion fixed? Checked with only the culprit changed. */
  ok: (m: MockMotion) => boolean;
  why: string;
}

const exitDur = (m: MockMotion) => m.exitDuration ?? Math.round((m.duration ?? 280) * 0.7);

export const CASES: FixCase[] = [
  { kind: "menu", broken: { easing: "--ease-out", duration: 900 }, word: "sluggish", culprit: "duration", ok: (m) => (m.duration ?? 0) <= 300, why: "A menu opens many times a day. At 900ms you wait for it; around 200ms it is simply there. (Chapter 22.)" },
  { kind: "card", broken: { easing: "--ease-in", duration: 320, distance: 24 }, word: "hits a wall", culprit: "easing", ok: (m) => ["--ease-out", "spring.snappy", "ease-in-out"].includes(m.easing ?? ""), why: "It's still speeding up when it arrives. Things arrive and settle: decelerate into place with ease-out, or a damped spring. (Chapter 3.)" },
  { kind: "toast", broken: { easing: "ease-in-out", duration: 1100, distance: 16 }, word: "floaty", culprit: "duration", ok: (m) => (m.duration ?? 0) <= 400, why: "Over a second, a small toast drifts. The same curve at about 300ms lands. (Chapter 2.)" },
  { kind: "dot", broken: { easing: "linear", duration: 520 }, word: "mechanical", culprit: "easing", ok: (m) => !["linear", "--ease-in"].includes(m.easing ?? ""), why: "Constant speed is how machines move. A curve that slows into the end gives it a finish: the dot lands instead of stopping dead. (Chapter 3.)" },
  { kind: "list", broken: { easing: "--ease-out", duration: 300, stagger: 160, distance: 12 }, word: "slow to arrive", culprit: "stagger", ok: (m) => (m.stagger ?? 0) <= 50, why: "At 160ms apart, the last row arrives long after the first. At 20–40ms the rows read as one gesture. (Chapter 8.)" },
  { kind: "card", broken: { easing: "--ease-out", duration: 300, distance: 160 }, word: "shouting", culprit: "distance", ok: (m) => (m.distance ?? 0) <= 40, why: "A routine card travelling 160px takes over the screen. A short rise says the same thing quietly. (Chapter 22.)" },
  { kind: "modal", broken: { easing: "spring(response .45 bounce .55)" }, word: "nervous", culprit: "easing", ok: (m) => ["--ease-out", "spring.snappy", "ease-in-out"].includes(m.easing ?? ""), why: "A dialog that wobbles has no reason to: nothing threw it. A damped arrival is calm. (Chapter 5.)" },
  { kind: "card", broken: { easing: "linear", duration: 70, distance: 24 }, word: "abrupt", culprit: "duration", ok: (m) => (m.duration ?? 0) >= 180 && (m.duration ?? 0) <= 450, why: "Four frames is barely a motion: it reads as a jump. Give it enough frames to show where it came from. (Chapter 2.)" },
  { kind: "drawer", direction: "exit", broken: { easing: "--ease-out", duration: 380, exitEasing: "--ease-in", exitDuration: 760 }, word: "lingering", culprit: "duration", ok: (m) => exitDur(m) <= 300, why: "The drawer is leaving your attention; it shouldn't take longer than it took to arrive. Exits run at about 0.7× the enter. (Chapter 9.)" },
];

export interface FixSpec {
  index: number;
}
export interface FixAnswer {
  knob: Knob;
  motion: MockMotion;
}

/** A broken animation and a feeling word. Fix it in one change. */
export const fixFeeling: DrillDef<FixSpec, FixAnswer> = {
  id: "fix-feeling",
  name: "Fix the feeling",
  prompt: "It feels wrong. Name the cause, and fix it in one change.",
  trains: "Critique: feeling → cause → parameter → change one thing",
  unlocksAfter: 22,
  kind: "choice",
  make(rand) {
    return { index: Math.floor(rand() * CASES.length) };
  },
  score(spec, a) {
    const c = CASES[spec.index];
    const rightKnob = a.knob === c.culprit;
    const fixed = rightKnob && c.ok(a.motion);
    return {
      correct: fixed,
      points: fixed ? 100 : rightKnob ? 40 : 0,
      truth: ["duration", "easing", "distance", "stagger"].indexOf(c.culprit),
      answer: ["duration", "easing", "distance", "stagger"].indexOf(a.knob),
      verdict: `${fixed ? "Fixed." : rightKnob ? (a.knob === "easing" ? "Right parameter, but that curve doesn't fix it." : "Right parameter, not the right amount.") : `The cause was ${c.culprit}, not ${a.knob}.`} ${c.why}`,
      meta: { word: c.word, knob: a.knob, culprit: c.culprit },
    };
  },
};
