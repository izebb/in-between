/**
 * Orchestration: timing *between* motions. Stagger groups, sequences, settle hooks.
 */

import { stagger as staggerTokens, duration } from "./tokens";
import { play, type Primitive } from "./primitives";
import { prefersReducedMotion } from "./policy";

/** Play one primitive across siblings, each a stagger step later (reading order). */
export function stagger(els: Iterable<Element>, make: () => Primitive, step = staggerTokens.step): Animation[] {
  const reduced = prefersReducedMotion();
  const out: Animation[] = [];
  let i = 0;
  for (const el of els) {
    const a = play(el, make(), { delay: reduced ? 0 : i * step });
    if (a) out.push(a);
    i++;
  }
  return out;
}

/** Run steps one after another; each step returns animations to wait for. */
export async function sequence(steps: (() => Animation[] | Animation | null | void)[]): Promise<void> {
  for (const s of steps) {
    const r = s();
    const list = Array.isArray(r) ? r : r ? [r] : [];
    await Promise.all(list.map((a) => a.finished.catch(() => undefined)));
  }
}

/** Resolve when every animation settles (finished or cancelled). The `onSettle` hook. */
export function onSettle(anims: Animation[]): Promise<void> {
  return Promise.all(anims.map((a) => a.finished.catch(() => undefined))).then(() => undefined);
}

/** A pause measured in tokens, for sequences. */
export const beat = (d: keyof typeof duration = "quick") =>
  new Promise<void>((r) => setTimeout(r, prefersReducedMotion() ? 0 : duration[d]));
