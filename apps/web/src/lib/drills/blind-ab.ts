import type { DrillDef } from "./types";
import { shuffle } from "./types";
import type { MockKind, MockMotion } from "~/components/figures/Mock.svelte";
import { easingFn } from "@inbetween/core";
import { parseSpec } from "~/lib/spec";

/**
 * A curve with frames missing, as a linear() easing. Each number in `holds` is how many 60Hz frames one
 * drawing stays on screen; the frames in between are never drawn, so the move holds, then jumps to where
 * it should be by now. The path and the timing are the curve's own: only the drawing is missing.
 */
function dropped(curve: string, holds: number[]): string {
  const ease = easingFn(parseSpec(curve)).ease;
  const frames = holds.reduce((a, b) => a + b, 0);
  const pct = (f: number) => `${+((f / frames) * 100).toFixed(2)}%`;
  const stops: string[] = [];
  let f = 0;
  for (const h of holds) {
    const v = +ease(f / frames).toFixed(4);
    stops.push(`${v} ${pct(f)}`, `${v} ${pct(f + h)}`);
    f += h;
  }
  stops.push("1 100%");
  return `linear(${stops.join(", ")})`;
}

export interface ABPair {
  kind: MockKind;
  direction?: "enter" | "exit" | "loop";
  good: MockMotion;
  bad: MockMotion;
  word: string;
  why: string;
  topics: string[];
}

export const WORDS = ["arrives", "quicker", "calmer", "clearer", "connected", "physical", "honest", "lighter"] as const;

export const PAIRS: ABPair[] = [
  { kind: "card", good: { easing: "--ease-out", duration: 320, distance: 24 }, bad: { easing: "ease-in", duration: 320, distance: 24 }, word: "arrives", why: "It slows into place, so it lands. Ease-in is still accelerating when it stops, so it hits a wall. (Chapter 3.)", topics: ["easing", "enter-exit", "spacing"] },
  { kind: "modal", direction: "exit", good: { easing: "--ease-out", duration: 280, exitEasing: "--ease-in", exitDuration: 180 }, bad: { easing: "--ease-out", duration: 280, exitEasing: "--ease-out", exitDuration: 640 }, word: "quicker", why: "Exits should get out of the way: shorter, and accelerating away. (Chapter 9.)", topics: ["enter-exit", "timing"] },
  { kind: "menu", good: { easing: "--ease-out", duration: 160 }, bad: { easing: "--ease-out", duration: 700 }, word: "quicker", why: "A menu is opened many times a day. A long animation turns into a wait. (Chapter 22.)", topics: ["timing", "taste", "frequency"] },
  { kind: "list", good: { easing: "--ease-out", duration: 280, stagger: 30, distance: 12 }, bad: { easing: "--ease-out", duration: 280, stagger: 170, distance: 12 }, word: "calmer", why: "At 30ms apart the rows read as one gesture. At 170ms you wait for the list to finish arriving. (Chapter 8.)", topics: ["stagger", "choreography"] },
  { kind: "toggle", good: { easing: "spring.snappy" }, bad: { easing: "linear", duration: 600 }, word: "physical", why: "A switch is direct manipulation: a quick, damped spring feels like a physical part. Linear over 600ms feels like a machine. (Chapter 5.)", topics: ["springs", "direct", "physics"] },
  { kind: "card", good: { easing: "--ease-out", duration: 280, distance: 16 }, bad: { easing: "--ease-out", duration: 280, distance: 140 }, word: "calmer", why: "Small distances keep the page calm. A big travel claims the whole screen for a routine change. (Chapter 22.)", topics: ["taste", "enter-exit"] },
  { kind: "tabs", good: { easing: "--ease-inout", duration: 300 }, bad: { none: true }, word: "connected", why: "The underline slides: one indicator, moving. With a cut you look for where it went. (Chapter 10.)", topics: ["continuity", "permanence", "information"] },
  { kind: "expand", good: { easing: "--ease-out", duration: 460 }, bad: { none: true }, word: "connected", why: "The tile grows into the detail view, so you know what you opened. (Chapter 10.)", topics: ["continuity", "permanence", "spatial"] },
  { kind: "badge", good: { easing: "spring(response .35 bounce .4)" }, bad: { easing: "ease-in-out", duration: 900 }, word: "clearer", why: "A quick pop reads as news. A slow grow is easy to miss and slow to read. (Chapter 1.)", topics: ["attention", "principles", "springs"] },
  { kind: "drawer", good: { easing: "--ease-out", duration: 380 }, bad: { easing: "linear", duration: 150 }, word: "clearer", why: "A large panel needs enough time to show where it came from; linear and short feels like a jump. (Chapter 11.)", topics: ["spatial", "timing", "enter-exit"] },
  { kind: "toast", good: { easing: "--ease-out", duration: 280, distance: 16 }, bad: { easing: "cubic-bezier(.3,2.2,.5,1)", duration: 600, distance: 16 }, word: "honest", why: "A toast is routine. A big bounce every time is noise, and it pretends the toast has momentum it doesn't. (Chapter 22.)", topics: ["taste", "springs", "principles"] },
  { kind: "dot", good: { easing: "cubic-bezier(.1,.7,.1,1)", duration: 900 }, bad: { easing: "linear", duration: 300 }, word: "physical", why: "A thrown thing glides to a stop: speed decays. Stopping dead at full speed looks like a wall. (Chapter 6.)", topics: ["momentum", "physics", "direct"] },
  { kind: "modal", good: { easing: "spring.soft" }, bad: { easing: "ease-in-out", duration: 700 }, word: "quicker", why: "The dialog is ready almost at once and settles. The slow ease-in-out makes you wait at both ends. (Chapter 5.)", topics: ["timing", "springs", "enter-exit"] },
  { kind: "drop", good: { easing: "ease-in", duration: 420 }, bad: { easing: "ease-out", duration: 420 }, word: "physical", why: "Falling things accelerate: gravity. Easing out makes the ball brake in mid-air. (Chapter 4.)", topics: ["weight", "physics", "principles"] },
  { kind: "like", good: { easing: "--ease-out", duration: 340 }, bad: { none: true }, word: "clearer", why: "The heart squashes under your tap, then fills and pops: the press was felt. With a cut it just turns red, which is easy to miss. (Chapter 1.)", topics: ["feedback", "principles", "information", "direct"] },
  { kind: "list", good: { easing: "--ease-out", duration: 240, stagger: 24, distance: 10 }, bad: { easing: "--ease-out", duration: 240, stagger: 0, distance: 10 }, word: "clearer", why: "A small stagger gives the list a reading order. All at once, it's one block appearing. (Chapter 8.)", topics: ["stagger", "choreography", "hierarchy"] },
  { kind: "list", good: { easing: "--ease-out", duration: 280, stagger: 35, distance: 12 }, bad: { easing: "--ease-out", duration: 280, stagger: 110, distance: 12 }, word: "quicker", why: "Every row is a wait at 110ms apart; at 35ms the list has arrived before you've finished reading the first row. (Chapter 8.)", topics: ["stagger", "timing", "choreography"] },
  { kind: "list", good: { easing: "--ease-out", duration: 320, stagger: 30, distance: 10 }, bad: { easing: "--ease-out", duration: 320, stagger: 30, distance: 60 }, word: "calmer", why: "Same stagger, but each row travels 60px: the cascade becomes a waterfall. Short rises keep the order without the noise. (Chapter 8.)", topics: ["stagger", "choreography", "taste"] },
  // Care (chapter 21): what to show someone who asked for less motion. Reduce, don't remove.
  { kind: "card", good: { easing: "--ease-out", duration: 200, distance: 0 }, bad: { easing: "spring(response .5 bounce .4)", distance: 120 }, word: "calmer", why: "For someone who asked for less motion, the fade still says something arrived. A bouncing slide across the card is exactly the travel they asked to be spared. (Chapter 21.)", topics: ["care", "taste"] },
  { kind: "modal", good: { easing: "--ease-out", duration: 200, distance: 0 }, bad: { none: true }, word: "clearer", why: "Reduce, don't remove: the fade keeps the message that a dialog arrived. The cut can be missed, and then the page just changed under you. (Chapter 21.)", topics: ["care", "information"] },
  { kind: "toast", good: { easing: "--ease-out", duration: 220, distance: 0 }, bad: { easing: "--ease-out", duration: 520, distance: 90 }, word: "calmer", why: "The reduced version fades where it will sit. The long rise pulls the eye across the screen for a routine note. (Chapter 21.)", topics: ["care", "attention"] },
  { kind: "list", good: { easing: "--ease-out", duration: 260, stagger: 25, distance: 10 }, bad: { easing: "linear", duration: 260, stagger: 25, distance: 10 }, word: "arrives", why: "With linear timing each row stops dead; with ease-out each one settles, so the list lands row by row. (Chapter 3.)", topics: ["stagger", "easing", "choreography"] },
  { kind: "swap", good: { easing: "--ease-inout", duration: 520 }, bad: { none: true }, word: "connected", why: "The item travels to the other list, so you see which one moved. With a cut, you compare both lists to find it. (Chapter 10.)", topics: ["permanence", "continuity", "information"] },
  { kind: "expand", good: { easing: "--ease-out", duration: 460 }, bad: { easing: "--ease-out", duration: 1400 }, word: "quicker", why: "The tile should grow into its detail, not crawl there: at 1.4s the connection is clear but you wait for it. (Chapter 10.)", topics: ["permanence", "timing"] },
  { kind: "drawer", good: { easing: "--ease-out", duration: 360 }, bad: { none: true }, word: "connected", why: "The panel slides in from the edge it lives on, so you know where it went when it closes. A cut hides the geography. (Chapter 11.)", topics: ["spatial", "continuity"] },
  { kind: "modal", good: { easing: "--ease-out", duration: 280 }, bad: { easing: "linear", duration: 900 }, word: "clearer", why: "A dialog comes toward you and the page behind dims: one quick move up the z-axis. Slow and linear, it drifts in with no sense of depth. (Chapter 11.)", topics: ["spatial", "timing"] },
  { kind: "toggle", good: { easing: "spring.snappy" }, bad: { easing: "ease-in-out", duration: 520 }, word: "physical", why: "A switch you flick should answer at once and settle. A slow ease-in-out makes the knob lag behind the tap. (Chapter 12.)", topics: ["direct", "feedback", "springs"] },
  // 700ms is 42 frames at 60Hz; the stuttering one draws 9 of them.
  { kind: "dot", good: { easing: "--ease-out", duration: 700 }, bad: { easing: dropped("--ease-out", [3, 5, 4, 6, 3, 7, 4, 5, 5]), duration: 700 }, word: "clearer", why: "The same move with most of its frames missing: it holds, then jumps. That is what a dropped frame looks like; the smooth one had every frame drawn. (Chapter 20.)", topics: ["performance", "medium"] },
  // 300ms is 18 frames; the stuttering one draws 5.
  { kind: "card", good: { easing: "--ease-out", duration: 300, distance: 20 }, bad: { easing: dropped("--ease-out", [4, 3, 4, 3, 4]), duration: 300, distance: 20 }, word: "clearer", why: "The same rise drawn five times in 300ms reads as a stutter. Motion that can't keep its frames looks broken, not fast. (Chapter 20.)", topics: ["performance"] },
];

export interface BlindSpec {
  pair: ABPair;
  /** Which side (0 = A) shows the good version. */
  goodSide: 0 | 1;
  words: string[];
}
export interface BlindAnswer {
  pick: 0 | 1;
  word: string;
}

/** Two versions. Pick the better one, then say why in one word. */
export const blindAB: DrillDef<BlindSpec, BlindAnswer> = {
  id: "blind-ab",
  name: "Blind A/B",
  prompt: "Two versions. Which is better? Then say why, in one word.",
  trains: "Taste: judging, then naming the reason",
  unlocksAfter: 0,
  kind: "choice",
  make(rand, _level, opts) {
    const pool = opts?.topic ? PAIRS.filter((p) => p.topics.includes(opts.topic!)) : PAIRS;
    // A small topic is padded with taste pairs (at half the weight) so a round doesn't repeat itself.
    const list = pool.length >= 4 ? pool : pool.length ? [...pool, ...pool, ...PAIRS.filter((p) => !pool.includes(p) && p.topics.includes("taste"))] : PAIRS;
    const pair = list[Math.floor(rand() * list.length)];
    const others = shuffle(rand, WORDS.filter((w) => w !== pair.word)).slice(0, 3);
    return { pair, goodSide: rand() < 0.5 ? 0 : 1, words: shuffle(rand, [pair.word, ...others]) };
  },
  key: (spec) => JSON.stringify([spec.pair.kind, spec.pair.good, spec.pair.bad]),
  score(spec, a) {
    const ok = a.pick === spec.goodSide;
    const wordOk = a.word === spec.pair.word;
    const L = spec.goodSide === 0 ? "A" : "B";
    return {
      correct: ok,
      points: ok ? (wordOk ? 100 : 80) : 0,
      truth: spec.goodSide,
      answer: a.pick,
      verdict: `${ok ? `Yes, ${L}` : `The better one was ${L}`}${ok && !wordOk ? `, though the word is "${spec.pair.word}", not "${a.word}"` : `: "${spec.pair.word}"`}. ${spec.pair.why}`,
      meta: { word: a.word, expected: spec.pair.word, kind: spec.pair.kind },
    };
  },
};
