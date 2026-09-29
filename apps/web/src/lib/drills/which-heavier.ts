import type { DrillDef } from "./types";

export interface Ball {
  /** Gravity, px/s². */
  g: number;
  /** Fraction of speed kept per bounce. */
  e: number;
}

export interface WhichHeavierSpec {
  balls: [Ball, Ball];
  heavy: 0 | 1;
}

/** Two objects, same path. Which is heavier? */
export const whichHeavier: DrillDef<WhichHeavierSpec, number> = {
  id: "which-heavier",
  name: "Which Is Heavier?",
  prompt: "Two balls drop and bounce. Which one is heavier?",
  trains: "Weight: reading mass from timing and spacing",
  unlocksAfter: 4,
  kind: "choice",
  make(rand, level) {
    // The gap between heavy and light shrinks as you level up.
    const gap = Math.max(0.25, 1 - level * 0.18);
    const heavy: Ball = { g: 2400 + rand() * 400, e: 0.22 + rand() * 0.08 };
    const light: Ball = {
      g: heavy.g - (1300 + rand() * 300) * gap,
      e: Math.min(0.85, heavy.e + (0.42 + rand() * 0.08) * gap),
    };
    const h: 0 | 1 = rand() < 0.5 ? 0 : 1;
    return { balls: h === 0 ? [heavy, light] : [light, heavy], heavy: h };
  },
  score(spec, answer) {
    const ok = answer === spec.heavy;
    const [a, b] = spec.balls;
    const d = (x: Ball) => `gravity ${Math.round(x.g)}px/s², keeps ${Math.round(x.e * 100)}% per bounce`;
    return {
      correct: ok,
      points: ok ? 100 : 0,
      truth: spec.heavy,
      answer,
      verdict: `${ok ? "Yes" : `The heavy one was ${spec.heavy === 0 ? "A" : "B"}`}: it falls faster and keeps less of its bounce. A: ${d(a)}. B: ${d(b)}.`,
    };
  },
};

/** Simulate a drop: positions (0 = top, 1 = floor) at a fixed step. */
export function simulateDrop(ball: Ball, seconds = 2.2, dt = 1 / 120, height = 1) {
  const out: number[] = [];
  let y = 0;
  let v = 0;
  // Normalise so gravity reads in px/s² for a ~160px drop.
  const g = ball.g / (160 * height);
  for (let t = 0; t <= seconds; t += dt) {
    v += g * dt;
    y += v * dt;
    if (y > 1) {
      y = 1;
      v = -v * ball.e;
      if (Math.abs(v) < 0.05) v = 0;
    }
    out.push(y);
  }
  return out;
}
