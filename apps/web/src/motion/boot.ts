/**
 * Runs on every page (and after every client-side navigation).
 */

import {
  applyPrefs,
  getModePref,
  getMotionPref,
  getSoundPref,
  getThemePref,
  setModePref,
  setMotionPref,
  setSoundPref,
  setThemePref,
  type ThemeId,
} from "./policy";
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

const MOTION_NOTE = {
  full: "Everything moves as it was drawn.",
  reduce: "Movement stops; fades and ghosts stay.",
};

function wirePrefs() {
  const root = document.querySelector<HTMLElement>("[data-prefs]");
  if (!root) return;
  placePrefs(root);
  const field = root.querySelector<HTMLButtonElement>("[data-theme-field]")!;
  const list = root.querySelector<HTMLElement>("[data-theme-list]")!;
  const options = [...list.querySelectorAll<HTMLElement>("[data-theme-option]")];
  const note = root.querySelector<HTMLElement>("[data-motion-note]");
  const tick = root.querySelector<HTMLButtonElement>("[data-pref-switch]");

  const sync = () => {
    const state: Record<string, string> = { mode: getModePref(), motion: getMotionPref() };
    root.querySelectorAll<HTMLButtonElement>("button[data-pref]").forEach((b) => {
      b.setAttribute("aria-pressed", String(state[b.dataset.pref!] === b.dataset.value));
    });
    tick?.setAttribute("aria-checked", String(getSoundPref()));
    // The field shows the theme on: its swatch, its name in its own face, its type.
    const theme = getThemePref();
    options.forEach((o) => o.setAttribute("aria-selected", String(o.dataset.themeOption === theme)));
    const on = options.find((o) => o.dataset.themeOption === theme) ?? options[0];
    const sw = field.querySelector<HTMLElement>("[data-theme-swatch]")!;
    sw.setAttribute("style", on.querySelector(".swatch")!.getAttribute("style") ?? "");
    const name = field.querySelector<HTMLElement>("[data-theme-name]")!;
    name.textContent = on.querySelector(".pf-name")!.textContent;
    name.setAttribute("style", on.querySelector(".pf-name")!.getAttribute("style") ?? "");
    field.querySelector<HTMLElement>("[data-theme-fonts]")!.textContent = on.dataset.fonts ?? "";
    if (note) {
      const m = getMotionPref();
      const reduced = m === "reduce" || (m === "system" && matchMedia("(prefers-reduced-motion: reduce)").matches);
      note.textContent = m === "system" ? `Follows your device: ${reduced ? "reduced" : "full"} motion, right now.` : MOTION_NOTE[m];
    }
  };

  // The theme list: a listbox that opens under the field. Arrows move, Enter or Space chooses,
  // Escape shuts the list (not the popover), and leaving it shuts it.
  let active = 0;
  const mark = (i: number) => {
    active = (i + options.length) % options.length;
    options.forEach((o, k) => o.classList.toggle("is-active", k === active));
    list.setAttribute("aria-activedescendant", options[active].id);
    options[active].scrollIntoView({ block: "nearest" });
  };
  const open = () => {
    list.hidden = false;
    field.setAttribute("aria-expanded", "true");
    mark(Math.max(0, options.findIndex((o) => o.getAttribute("aria-selected") === "true")));
    list.focus();
  };
  const shut = (refocus = true) => {
    if (list.hidden) return;
    list.hidden = true;
    field.setAttribute("aria-expanded", "false");
    if (refocus) field.focus();
  };
  const choose = (i: number) => {
    setThemePref(options[i].dataset.themeOption as ThemeId);
    sync();
    shut();
  };
  field.addEventListener("click", () => (list.hidden ? open() : shut()));
  field.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      open();
    }
  });
  list.addEventListener("keydown", (e) => {
    const keys: Record<string, () => void> = {
      ArrowDown: () => mark(active + 1),
      ArrowUp: () => mark(active - 1),
      Home: () => mark(0),
      End: () => mark(options.length - 1),
      Enter: () => choose(active),
      " ": () => choose(active),
      Escape: () => shut(),
    };
    if (keys[e.key]) {
      e.preventDefault(); // Escape: this closes the list, not the popover around it
      e.stopPropagation();
      keys[e.key]();
    } else if (e.key === "Tab") shut(false);
  });
  options.forEach((o, i) => {
    o.addEventListener("click", () => choose(i));
    o.addEventListener("pointermove", () => active !== i && mark(i));
  });
  root.addEventListener("pointerdown", (e) => {
    if (!list.hidden && !(e.target as Element).closest(".pf-select")) shut(false);
  });
  root.addEventListener("toggle", (e) => (e as ToggleEvent).newState === "closed" && shut(false));

  root.querySelectorAll<HTMLButtonElement>("button[data-pref]").forEach((b) => {
    b.addEventListener("click", () => {
      const v = b.dataset.value!;
      if (b.dataset.pref === "mode") setModePref(v as never);
      if (b.dataset.pref === "motion") setMotionPref(v as never);
      sync();
    });
  });
  tick?.addEventListener("click", () => {
    setSoundPref(!getSoundPref());
    sync();
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
