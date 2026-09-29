/**
 * Patterns: composed choreography built from primitives and tokens.
 */

import { duration, exitDuration, easingCss, stagger as staggerToken } from "./tokens";
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

/**
 * Masked line reveal (the SplitText "masked lines" pattern): split a paragraph into the lines it
 * actually wraps to, put each line in a mask, and let each rise out of it, a beat apart, on the
 * expo-out token. Inline elements (an <em>, a link) travel whole with their line. When it is done
 * the paragraph goes back to its original markup, so it reflows freely.
 *
 * Order: data-reveal-delay="base" waits one duration token first; data-reveal-after="#id" waits
 * until that element's last line is on its way, so a quote can follow the paragraph it sits beside.
 */
function tokensOf(text: HTMLElement): string[] {
  const out: string[] = [];
  text.childNodes.forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE) out.push(...(n.textContent ?? "").split(/\s+/).filter(Boolean));
    else if (n.nodeType === Node.ELEMENT_NODE) out.push((n as Element).outerHTML);
  });
  return out;
}

export function revealLines(el: HTMLElement, wait = 0) {
  const text = el.matches("[data-lines]") ? el : el.querySelector<HTMLElement>("[data-lines]");
  if (!text) return;
  const named = el.dataset.revealDelay as keyof typeof duration | undefined;
  let delay = wait + (named && named in duration ? duration[named] : 0);
  const after = el.dataset.revealAfter ? document.querySelector<HTMLElement>(el.dataset.revealAfter) : null;
  if (after?.dataset.revealLead) delay = Math.max(delay, Number(after.dataset.revealLead) - performance.now());

  const original = text.innerHTML;
  const tokens = tokensOf(text);
  text.innerHTML = tokens.map((t) => `<span class="rl-w">${t}</span>`).join(" ");
  const lines: string[][] = [];
  let top = -Infinity;
  text.querySelectorAll<HTMLElement>(".rl-w").forEach((w, i) => {
    if (w.offsetTop > top + 2) {
      lines.push([]);
      top = w.offsetTop;
    }
    lines[lines.length - 1].push(tokens[i]);
  });
  text.innerHTML = lines.map((l) => `<span class="rl-mask"><span class="rl-line">${l.join(" ")}</span></span>`).join("");
  const beat = staggerToken.step * 2; // between one line and the next
  const anims = [...text.querySelectorAll<HTMLElement>(".rl-line")].map((line, i) =>
    line.animate([{ transform: "translateY(100%)", opacity: 0 }, { transform: "none", opacity: 1 }], {
      duration: duration.scene,
      easing: easingCss.reveal,
      delay: delay + i * beat,
      fill: "backwards",
    }),
  );
  // When the last line is on its way, anything waiting on this one may start.
  el.dataset.revealLead = String(performance.now() + delay + lines.length * beat + duration.quick);
  const cite = el.querySelector("figcaption");
  if (cite) {
    anims.push(cite.animate([{ opacity: 0 }, { opacity: 1 }], { duration: duration.scene, easing: easingCss.out, delay: delay + lines.length * beat + duration.quick, fill: "backwards" }));
  }
  Promise.all(anims.map((a) => a.finished.catch(() => undefined))).then(() => (text.innerHTML = original));
}

/**
 * Block reveal: an element that isn't text to split (a row, a heading) fades in. A rule drawn as a
 * background (data-reveal-block="rule") rises out of its own box like a masked line of text: its
 * marks start below the edge and come up into place. data-reveal-i staggers siblings.
 */
export function revealBlock(el: HTMLElement, wait = 0) {
  const delay = wait + Number(el.dataset.revealI ?? 0) * staggerToken.step * 2;
  if (el.dataset.revealBlock === "rule") {
    const layers = (getComputedStyle(el).backgroundImage.match(/gradient\(|url\(/g) ?? [""]).length;
    const below = `0 ${el.offsetHeight * 2}px`;
    el.animate(
      [
        { backgroundPosition: Array(layers).fill(below).join(", "), opacity: 0 },
        { backgroundPosition: Array(layers).fill("0 100%").join(", "), opacity: 1 },
      ],
      { duration: duration.scene, easing: easingCss.reveal, delay, fill: "backwards" },
    );
    return;
  }
  el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: duration.scene, easing: easingCss.out, delay, fill: "backwards" });
}

/**
 * Things that play once, the first time they are in view: written-on titles, masked-line reveals
 * and block reveals. The page's title section (data-reveal-section) goes first; anything after it
 * that is already on screen waits for it, starting as its last beat plays (one scene before it ends).
 */
let gate = 0; // performance.now() when the title section's entrance ends

function sectionEnd(section: Element): number {
  const now = performance.now();
  let end = now;
  for (const a of section.getAnimations({ subtree: true })) {
    const t = a.effect?.getComputedTiming();
    if (t && typeof t.endTime === "number") end = Math.max(end, now + t.endTime - Number(a.currentTime ?? 0));
  }
  section.querySelectorAll<HTMLElement>("[data-playing-until]").forEach((e) => (end = Math.max(end, Number(e.dataset.playingUntil))));
  return end;
}

export function observeInViewOnce(root: ParentNode = document): () => void {
  const items = [...root.querySelectorAll<HTMLElement>(".ink-h:not(.is-in), [data-reveal-lines]:not(.is-in), [data-reveal-block]:not(.is-in)")];
  if (!items.length) return () => {};
  if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
    items.forEach((h) => h.classList.add("is-in"));
    return () => {};
  }
  gate = 0;
  const io = new IntersectionObserver(
    (entries) => {
      const inView = entries.filter((e) => e.isIntersecting).map((e) => e.target as HTMLElement);
      // Document order: the title section comes first, so the gate is set before anything waits on it.
      inView.sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
      for (const el of inView) {
        const section = el.closest("[data-reveal-section]");
        const wait = section ? 0 : Math.max(0, gate - performance.now());
        if (el.hasAttribute("data-reveal-lines")) revealLines(el, wait);
        else if (el.hasAttribute("data-reveal-block")) revealBlock(el, wait);
        el.classList.add("is-in");
        // What follows overlaps the title section's last beat rather than waiting for its final frame.
        if (section) gate = Math.max(gate, sectionEnd(section) - duration.scene);
        io.unobserve(el);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0 },
  );
  items.forEach((h) => io.observe(h));
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
