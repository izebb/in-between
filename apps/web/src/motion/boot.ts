/**
 * Runs on every page (and after every client-side navigation).
 */

import { applyPrefs, getMotionPref, getThemePref, getSoundPref, setMotionPref, setThemePref, setSoundPref } from "./policy";
import { observeFigureReveals } from "./patterns";
import { installInspector } from "./inspector";

function wirePrefs() {
  const root = document.querySelector<HTMLElement>("[data-prefs]");
  if (!root) return;
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

function boot() {
  document.documentElement.classList.add("js");
  applyPrefs();
  wirePrefs();
  observeFigureReveals();
  installInspector();
}

document.addEventListener("astro:page-load", boot);
document.addEventListener("astro:after-swap", () => applyPrefs());
