/**
 * Primitives: single, reusable motions, written only in tokens.
 * Each returns WAAPI keyframes + timing and declares its interruption rule.
 * Under reduced motion, transforms are dropped: a primitive becomes a fade or nothing.
 */

import { duration, exitDuration, easingCss, spring, distance } from "./tokens";
import { prefersReducedMotion, type Interruption } from "./policy";

export interface Primitive {
  name: string;
  keyframes: Keyframe[];
  timing: KeyframeAnimationOptions;
  interrupt: Interruption;
}

type Dir = "in" | "out";

const enter = (d: keyof typeof duration) => ({ duration: duration[d], easing: easingCss.out, fill: "both" as const });
const exit = (d: keyof typeof duration) => ({ duration: exitDuration[d], easing: easingCss.in, fill: "both" as const });

export const fade = (dir: Dir = "in"): Primitive => ({
  name: `fade-${dir}`,
  keyframes: dir === "in" ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 1 }, { opacity: 0 }],
  timing: dir === "in" ? enter("quick") : exit("quick"),
  interrupt: "reverse",
});

export const rise = (dir: Dir = "in", dist: keyof typeof distance = "rise"): Primitive => {
  const y = `${distance[dist]}px`;
  const hidden = { opacity: 0, transform: `translateY(${y})` };
  const shown = { opacity: 1, transform: "none" };
  return {
    name: `rise-${dir}`,
    keyframes: dir === "in" ? [hidden, shown] : [shown, hidden],
    timing: dir === "in" ? enter("base") : exit("base"),
    interrupt: "reverse",
  };
};

export const scaleIn = (dir: Dir = "in"): Primitive => ({
  name: `scale-${dir}`,
  keyframes:
    dir === "in"
      ? [{ opacity: 0, transform: "scale(0.96)" }, { opacity: 1, transform: "none" }]
      : [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(0.96)" }],
  timing:
    dir === "in"
      ? { duration: spring.snappy.duration, easing: spring.snappy.linear, fill: "both" }
      : exit("quick"),
  interrupt: "retarget",
});

/** Height collapse for disclosure content. Uses the measured height. A tall one travels further, so
 *  it can take a longer token (distance changes the right duration). */
export const collapse = (el: HTMLElement, dir: Dir = "out", d: keyof typeof duration = "base"): Primitive => {
  const h = `${el.scrollHeight}px`;
  const open = { height: h, opacity: 1 };
  const shut = { height: "0px", opacity: 0 };
  return {
    name: `collapse-${dir}`,
    keyframes: dir === "out" ? [open, shut] : [shut, open],
    timing: dir === "out" ? exit(d) : enter(d),
    interrupt: "reverse",
  };
};

/** A moved thing sliding to its new place (on-screen move: ease-in-out). */
export const move = (dx: number, dy: number): Primitive => ({
  name: "move",
  keyframes: [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
  timing: { duration: duration.base, easing: easingCss.inout, fill: "both" },
  interrupt: "retarget",
});

/** Remove movement, keep opacity: the reduced-motion version of any primitive. */
export function reduce(p: Primitive): Primitive {
  const keyframes = p.keyframes.map((k) => {
    const { transform: _t, translate: _tr, scale: _s, height: _h, ...rest } = k as Record<string, unknown>;
    return rest as Keyframe;
  });
  const hasAny = keyframes.some((k) => Object.keys(k).some((key) => key !== "offset" && key !== "easing"));
  return {
    ...p,
    keyframes: hasAny ? keyframes : [],
    timing: { ...p.timing, duration: Math.min(Number(p.timing.duration) || 0, duration.quick) },
  };
}

const running = new WeakMap<Element, Animation>();

/**
 * Play a primitive on an element, honouring policy (reduced motion) and the
 * interruption contract (a new motion on the same element reverses or replaces the old).
 */
export function play(el: Element, p: Primitive, opts: { delay?: number } = {}): Animation | null {
  const prim = prefersReducedMotion() ? reduce(p) : p;
  const prev = running.get(el);
  const live = !!prev && prev.playState === "running";
  // A previous motion that ran (or is running) still holds the element; a cancelled one ("idle") doesn't.
  const continuing = !!prev && prev.playState !== "idle";
  if (live && prim.interrupt === "finish") prev!.finish();
  // Start from where the element is now, so interruptions never jump. Read it *before* cancelling:
  // once the running animation is cancelled, the computed style is the resting style.
  const current = getComputedStyle(el);
  const from = { opacity: current.opacity, transform: current.transform, height: current.height };
  if (live && prim.interrupt !== "finish") prev!.cancel(); // reverse / retarget continue from `from`
  if (!prim.keyframes.length) return null;
  const first = { ...prim.keyframes[0] } as Record<string, string | number>;
  if (continuing && "opacity" in first) first.opacity = from.opacity;
  if (continuing && "transform" in first) first.transform = from.transform;
  if (continuing && "height" in first) first.height = from.height;
  const anim = el.animate([first as Keyframe, ...prim.keyframes.slice(1)], { ...prim.timing, delay: opts.delay ?? 0 });
  running.set(el, anim);
  return anim;
}
