/**
 * Keyframes with per-segment easing: each segment can ease differently.
 * The bouncing ball needs this: ease-in as it falls (gravity), ease-out as it rises.
 */

import type { EasingFn } from "./bezier.ts";

export interface Keyframe {
  /** Offset in the timeline, 0..1. */
  at: number;
  value: number;
  /** Easing used to travel *into* this keyframe from the previous one. */
  ease?: EasingFn;
}

export function keyframes(frames: Keyframe[]): (x: number) => number {
  const ks = [...frames].sort((a, b) => a.at - b.at);
  return (x: number) => {
    if (x <= ks[0].at) return ks[0].value;
    for (let i = 1; i < ks.length; i++) {
      const b = ks[i];
      if (x <= b.at) {
        const a = ks[i - 1];
        const span = b.at - a.at || 1;
        const local = (x - a.at) / span;
        const p = (b.ease ?? ((t: number) => t))(local);
        return a.value + (b.value - a.value) * p;
      }
    }
    return ks[ks.length - 1].value;
  };
}
