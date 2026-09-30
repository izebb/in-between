/**
 * Policy: the global rules every motion in the app obeys.
 *
 *   1. Reduced motion: reduce, don't remove. Movement stops; fades and ghosts stay.
 *   2. Frequency budget: the more often something is seen, the less it may move.
 *   3. Interruption contract: every motion declares what happens if it is interrupted.
 *   4. Concurrency budget: at most a handful of UI animations at once.
 */

import { themes, type ThemeId } from "./tokens";

export type MotionPref = "system" | "full" | "reduce";
/** Light or dark, chosen, or the system's. */
export type ModePref = "system" | "light" | "dark";
export type { ThemeId };

const MOTION_KEY = "ib-motion";
const MODE_KEY = "ib-mode";
/** The look (tokens.json themes). Before themes, this key held the mode; getModePref still reads that. */
const THEME_KEY = "ib-theme";
const SOUND_KEY = "ib-sound";
const THEME_IDS: readonly string[] = themes.map((t) => t.id);
const isMode = (v: string | null): v is ModePref => v === "system" || v === "light" || v === "dark";

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode: preferences simply don't persist */
  }
};

export const getMotionPref = (): MotionPref => (read(MOTION_KEY) as MotionPref) || "system";
export const getModePref = (): ModePref => {
  const m = read(MODE_KEY);
  if (isMode(m)) return m;
  const old = read(THEME_KEY);
  return isMode(old) ? old : "light";
};
export const getThemePref = (): ThemeId => {
  const t = read(THEME_KEY);
  return (t && THEME_IDS.includes(t) ? t : "pencil") as ThemeId;
};
export const getSoundPref = (): boolean => read(SOUND_KEY) === "on";

const systemReduced = () =>
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The one question every animated thing asks before it moves. */
export function prefersReducedMotion(): boolean {
  const p = typeof localStorage === "undefined" ? "system" : getMotionPref();
  return p === "reduce" || (p === "system" && systemReduced());
}

export function applyPrefs(doc: Document = document) {
  const root = doc.documentElement;
  const m = getMotionPref();
  if (m === "system") root.removeAttribute("data-motion");
  else root.setAttribute("data-motion", m);
  const mode = getModePref();
  if (mode === "system") root.removeAttribute("data-mode");
  else root.setAttribute("data-mode", mode);
  const theme = getThemePref();
  if (theme === "pencil") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export function setMotionPref(p: MotionPref) {
  write(MOTION_KEY, p);
  applyPrefs();
  dispatchEvent(new CustomEvent("ib:prefs"));
}
export function setModePref(p: ModePref) {
  write(MODE_KEY, p);
  applyPrefs();
  dispatchEvent(new CustomEvent("ib:prefs"));
}
export function setThemePref(t: ThemeId) {
  write(THEME_KEY, t);
  applyPrefs();
  dispatchEvent(new CustomEvent("ib:prefs"));
}
export function setSoundPref(on: boolean) {
  write(SOUND_KEY, on ? "on" : "off");
  dispatchEvent(new CustomEvent("ib:prefs"));
}

/** Subscribe to anything that changes the motion policy (system setting or user toggle). */
export function onMotionPolicyChange(cb: (reduced: boolean) => void): () => void {
  const fire = () => cb(prefersReducedMotion());
  const mq = typeof matchMedia !== "undefined" ? matchMedia("(prefers-reduced-motion: reduce)") : null;
  mq?.addEventListener("change", fire);
  addEventListener("ib:prefs", fire);
  return () => {
    mq?.removeEventListener("change", fire);
    removeEventListener("ib:prefs", fire);
  };
}

/** Is the page currently dark? */
export function isDark(): boolean {
  const m = document.documentElement.getAttribute("data-mode");
  if (m) return m === "dark";
  return matchMedia("(prefers-color-scheme: dark)").matches;
}

/** What a motion does when something new interrupts it. */
export type Interruption =
  | "retarget" // springs: keep velocity, head for the new target
  | "reverse" // tweens that are undoable: play back from where they are
  | "finish" // jump to the end state, then run the new motion
  | "queue"; // wait (only for non-blocking, low-frequency moments)

/**
 * Frequency budget: how much motion a moment may use, by how often it is seen.
 * Seen constantly → nearly still. Seen once → may take the stage.
 */
export const frequencyBudget = {
  constant: { maxDuration: "instant", distance: 0 }, // typing, hovering, scrolling
  frequent: { maxDuration: "quick", distance: "nudge" }, // menus, tabs, toggles
  occasional: { maxDuration: "base", distance: "travel" }, // panels, dialogs
  rare: { maxDuration: "scene", distance: "travel" }, // chapter cuts, onboarding
} as const;

/** No more than this many UI animations running at once. Figures are exempt: they are content. */
export const MAX_CONCURRENT_UI = 6;
