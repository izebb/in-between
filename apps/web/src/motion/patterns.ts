/**
 * Patterns: composed choreography built from primitives and tokens.
 */

import { duration, exitDuration, easingCss } from "./tokens";
import { rise, fade, play } from "./primitives";
import { stagger } from "./orchestration";
import { prefersReducedMotion } from "./policy";

/**
 * Page cut: a quick cross-dissolve and a 4px rise. Calm and bookish.
 * Used as Astro's transition:animate on <main>.
 */
export const pageCut = {
  forwards: {
    old: [{ name: "ib-cut-out", duration: `${exitDuration.base}ms`, easing: easingCss.in, fillMode: "both" }],
    new: [{ name: "ib-cut-in", duration: `${duration.base}ms`, easing: easingCss.out, fillMode: "both", delay: `${Math.round(exitDuration.base * 0.5)}ms` }],
  },
  backwards: {
    old: [{ name: "ib-cut-out", duration: `${exitDuration.base}ms`, easing: easingCss.in, fillMode: "both" }],
    new: [{ name: "ib-cut-in", duration: `${duration.base}ms`, easing: easingCss.out, fillMode: "both", delay: `${Math.round(exitDuration.base * 0.5)}ms` }],
  },
};

/**
 * Figure reveal: as a plate scrolls into view, its axes draw, then ghosts appear, then the key lands.
 * The choreography itself lives in motion.css (.plate.is-revealed); this only decides *when*.
 */
export function observeFigureReveals(root: ParentNode = document): () => void {
  const plates = [...root.querySelectorAll<HTMLElement>(".plate[data-reveal]:not(.is-revealed)")];
  if (!plates.length) return () => {};
  if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
    plates.forEach((p) => p.classList.add("is-revealed"));
    return () => {};
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("is-revealed");
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
  );
  plates.forEach((p) => io.observe(p));
  return () => io.disconnect();
}

/** List enter: children rise in, one stagger step apart. */
export const listEnter = (list: Element) => stagger(list.children, () => rise("in"));

/** Panel open/close. */
export const panelOpen = (el: Element) => play(el, rise("in", "nudge"));
export const panelClose = (el: Element) => play(el, rise("out", "nudge"));

/** Result reveal (drills): the answer fades in after the judgement, never before. */
export const reveal = (el: Element) => play(el, fade("in"));

/**
 * Token morph: when code-panel tabs switch, shared numbers glide from their old place to the new one.
 * `pairs` holds screen rects before and after for each shared token.
 */
export function tokenMorph(
  layer: HTMLElement,
  pairs: { text: string; from: DOMRect; to: DOMRect }[],
): Promise<void> {
  if (prefersReducedMotion() || !pairs.length) return Promise.resolve();
  const host = layer.getBoundingClientRect();
  const anims: Animation[] = [];
  for (const p of pairs) {
    const ghost = document.createElement("span");
    ghost.className = "token-ghost";
    ghost.textContent = p.text;
    ghost.style.left = `${p.to.left - host.left}px`;
    ghost.style.top = `${p.to.top - host.top}px`;
    layer.appendChild(ghost);
    const dx = p.from.left - p.to.left;
    const dy = p.from.top - p.to.top;
    const a = ghost.animate(
      [{ transform: `translate(${dx}px, ${dy}px)`, opacity: 1 }, { transform: "none", opacity: 1 }],
      { duration: duration.base, easing: easingCss.inout, fill: "both" },
    );
    a.finished.finally(() => ghost.remove());
    anims.push(a);
  }
  return Promise.all(anims.map((a) => a.finished.catch(() => undefined))).then(() => undefined);
}
