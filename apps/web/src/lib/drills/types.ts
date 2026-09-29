/**
 * The Eye Trainer's drill contract. A drill makes trials, and scores answers.
 * The runner handles time, streaks, storage and the calibration graph.
 */
import type { DrillId } from "~/lib/curriculum";

export interface Scored {
  correct: boolean;
  /** 0..100 */
  points: number;
  /** Ground truth and the answer in the same units (for calibration). */
  truth: number;
  answer: number;
  /** One line shown after answering. */
  verdict: string;
  meta?: Record<string, unknown>;
}

export interface DrillDef<S = unknown, A = unknown> {
  id: DrillId;
  name: string;
  /** Imperative prompt shown above each trial. */
  prompt: string;
  /** What it trains, in one line. */
  trains: string;
  /** Chapter number after which it unlocks (0 = always). */
  unlocksAfter: number;
  /** "estimate" drills feed the calibration scatter; "choice" drills feed accuracy. */
  kind: "estimate" | "choice";
  unit?: string;
  make(rand: () => number, level: number): S;
  score(spec: S, answer: A): Scored;
}

export const pick = <T,>(rand: () => number, list: readonly T[]): T => list[Math.floor(rand() * list.length)];

export function shuffle<T>(rand: () => number, list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
