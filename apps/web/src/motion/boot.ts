/**
 * Runs on every page (and after every client-side navigation).
 */

import { applyPrefs, getMotionPref, getThemePref, getSoundPref, setMotionPref, setThemePref, setSoundPref } from "./policy";
import { observeFigureReveals, observeInViewOnce } from "./patterns";
import { installInspector } from "./inspector";
import { installControls } from "./controls";

let placement: AbortController | undefined;

/** Open the View popover under its button, right edges aligned, wherever the header puts the button. */
function placePrefs(root: HTMLElement) {
  placement?.abort();
  placement = new AbortController();
  const toggle = document.querySelector<HTMLElement>('[popovertarget="prefs"]');
  if (!toggle) return;
  const place = () => {
    const r = toggle.getBoundingClientRect();
    root.style.top = `${Math.round(r.bottom + 8)}px`;
    root.style.right = `${Math.max(8, Math.round(document.documentElement.clientWidth - r.right))}px`;
  };
  const whileOpen = () => root.matches(":popover-open") && place();
  root.addEventListener("beforetoggle", (e) => (e as ToggleEvent).newState === "open" && place(), { signal: placement.signal });
  addEventListener("resize", whileOpen, { signal: placement.signal });
}

/*
 * The page scrolls inside the frame, not the window. The browser and the router only know how to
 * restore the window's scroll, so the frame remembers its own position per history entry, and takes
 * keyboard focus so Space, arrows and Page Down scroll it without a click first.
 */
let firstLoad = true;
let navigationType: string | undefined;
document.addEventListener("astro:before-preparation", (e) => {
  navigationType = (e as Event & { navigationType?: string }).navigationType;
});

function wireScroller() {
  const scroller = document.querySelector<HTMLElement>("[data-scroller]");
  if (!scroller) return;
  const key = () => `ib-scroll:${(history.state as { index?: number } | null)?.index ?? 0}:${location.pathname}`;
  const loadType = (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)?.type;
  const returning = firstLoad ? loadType === "reload" || loadType === "back_forward" : navigationType === "traverse";
  if (returning && !location.hash) {
    try {
      const y = Number(sessionStorage.getItem(key()) ?? 0);
      if (y) scroller.scrollTop = y;
    } catch {}
  }
  firstLoad = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  scroller.addEventListener("scroll", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try { sessionStorage.setItem(key(), String(Math.round(scroller.scrollTop))); } catch {}
    }, 120);
  }, { passive: true });
  if (document.activeElement === document.body) scroller.focus({ preventScroll: true });
  // The glass header stops short of a classic scrollbar (overlay scrollbars measure 0).
  const frame = scroller.closest<HTMLElement>(".frame");
  const measure = () => frame?.style.setProperty("--scrollbar-w", `${scroller.offsetWidth - scroller.clientWidth}px`);
  measure();
  addEventListener("resize", measure, { signal: placement?.signal });
}

function wirePrefs() {
  const root = document.querySelector<HTMLElement>("[data-prefs]");
  if (!root) return;
  placePrefs(root);
  const sync = () => {
    const state: Record<string, string> = {
      theme: getThemePref(),
      motion: getMotionPref(),
      sound: getSoundPref() ? "on" : "off",
    };
    root.querySelectorAll<HTMLButtonElement>("button[data-pref]").forEach((b) => {
      b.setAttribute("aria-pressed", String(state[b.dataset.pref!] === b.dataset.value));
    });
  };
  root.querySelectorAll<HTMLButtonElement>("button[data-pref]").forEach((b) => {
    b.addEventListener("click", () => {
      const v = b.dataset.value!;
      if (b.dataset.pref === "theme") setThemePref(v as never);
      if (b.dataset.pref === "motion") setMotionPref(v as never);
      if (b.dataset.pref === "sound") setSoundPref(v === "on");
      sync();
    });
  });
  sync();
}

/** The footer ruler's playhead plays only while the ruler is on screen (motion.css .foot-rule). */
let rulerSeen: IntersectionObserver | undefined;
function wireFootRule() {
  rulerSeen?.disconnect();
  const rule = document.querySelector<HTMLElement>(".foot-rule");
  if (!rule) return;
  rulerSeen = new IntersectionObserver(([e]) => rule.toggleAttribute("data-playing", e.isIntersecting));
  rulerSeen.observe(rule);
}

function boot() {
  document.documentElement.classList.add("js");
  applyPrefs();
  wirePrefs();
  wireScroller();
  observeFigureReveals();
  observeInViewOnce();
  installInspector();
  installControls();
  wireFootRule();
}

document.addEventListener("astro:page-load", boot);
document.addEventListener("astro:after-swap", () => applyPrefs());
