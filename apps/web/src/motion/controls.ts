/**
 * Controls that move. A segmented control's selection is one thing that slides from the option it
 * left to the one chosen (object permanence, ch. 10), not a highlight that blinks out in one place and
 * on in another. One observer serves every .seg on the page, however it was made: the Seg component,
 * the raw groups in figures, the View popover, the code panel's tabs.
 *
 * It only measures: it sets --seg-x, --seg-y, --seg-w, --seg-h on the group for the pressed (or
 * selected) option, and components.css draws the indicator (.seg::before) and transitions it there,
 * so a quick second click retargets from wherever the indicator is. The first placement, and any
 * placement after the group was out of layout (a closed popover), snaps rather than slides in from
 * the corner.
 *
 * It also turns the replay mark when its button is pressed (turnReplay, below).
 */

import { spring } from "./tokens";
import { prefersReducedMotion } from "./policy";

const PRESSED = '[aria-pressed="true"], [aria-selected="true"]';
const placed = new WeakMap<HTMLElement, number>(); // group → the width it was last measured at
let ro: ResizeObserver | undefined;
let mo: MutationObserver | undefined;

function place(seg: HTMLElement) {
  const on = [...seg.children].find((c): c is HTMLElement => c instanceof HTMLElement && c.matches(PRESSED));
  const seen = placed.get(seg) ?? 0;
  placed.set(seg, seg.offsetWidth);
  if (!on || !on.offsetWidth) {
    seg.style.setProperty("--seg-on", "0");
    return;
  }
  // Out of layout until now: be there at once (no transition), then let the next change slide.
  const snap = !seen;
  if (snap) seg.setAttribute("data-seg-snap", "");
  seg.style.setProperty("--seg-x", `${on.offsetLeft}px`);
  seg.style.setProperty("--seg-y", `${on.offsetTop}px`);
  seg.style.setProperty("--seg-w", `${on.offsetWidth}px`);
  seg.style.setProperty("--seg-h", `${on.offsetHeight}px`);
  seg.style.setProperty("--seg-on", "1");
  seg.setAttribute("data-seg", "");
  if (snap) requestAnimationFrame(() => requestAnimationFrame(() => seg.removeAttribute("data-seg-snap")));
}

function adopt(seg: HTMLElement) {
  if (!placed.has(seg)) ro?.observe(seg);
  place(seg);
}

/**
 * A replay button's mark (ReplayIcon.svelte) turns once, anticlockwise, the way it points, when the
 * button is pressed. Turns add up (composite "add"), so pressing again mid-turn carries on from where
 * the mark is instead of snapping back. Under reduced motion it stays still: the replay is the answer.
 */
function turnReplay(e: Event) {
  const ico = (e.target as Element | null)?.closest("button, a")?.querySelector<SVGElement>(".r-ico");
  if (!ico || prefersReducedMotion()) return;
  ico.animate([{ rotate: "0deg" }, { rotate: "-360deg" }], {
    duration: spring.snappy.duration,
    easing: spring.snappy.linear,
    composite: "add",
  });
}

/** Runs on every page load; the observers and listener are made once and outlive client-side navigation. */
export function installControls() {
  ro ??= new ResizeObserver((entries) => entries.forEach((e) => place(e.target as HTMLElement)));
  document.querySelectorAll<HTMLElement>(".seg").forEach(adopt);
  if (mo) return;
  document.addEventListener("click", turnReplay);
  mo = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "attributes") {
        const seg = (r.target as Element).parentElement;
        if (seg?.classList.contains("seg")) adopt(seg);
        continue;
      }
      if (r.target instanceof HTMLElement && r.target.classList.contains("seg")) adopt(r.target);
      for (const n of r.addedNodes) {
        if (!(n instanceof HTMLElement)) continue;
        if (n.classList.contains("seg")) adopt(n);
        else if (n.childElementCount) n.querySelectorAll<HTMLElement>(".seg").forEach(adopt);
      }
    }
  });
  mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-pressed", "aria-selected"] });
}
