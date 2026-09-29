/**
 * The site practises what it teaches: hold Alt (⌥) over anything that moves to see
 * its duration, curve, and spring, named by token.
 */

import { parseEasing } from "@inbetween/core";
import { duration, exitDuration, easingCss, spring } from "./tokens";

let panel: HTMLDivElement | null = null;
let outlined: Element | null = null;
let active = false;
let lastPointer = { x: 0, y: 0 };

const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();

function tokenForDuration(ms: number): string | null {
  for (const [k, v] of Object.entries(duration)) if (v === ms) return `--dur-${k}`;
  for (const [k, v] of Object.entries(exitDuration)) if (v === ms) return `--dur-${k}-exit`;
  for (const [k, v] of Object.entries(spring)) if (v.duration === ms) return `--spring-${k}-dur`;
  return null;
}

function tokenForEasing(css: string): string | null {
  const n = norm(css);
  for (const [k, v] of Object.entries(easingCss)) if (norm(v) === n) return `--ease-${k}`;
  for (const [k, v] of Object.entries(spring)) if (norm(v.linear) === n) return `spring.${k}`;
  return null;
}

function parseMs(v: string): number {
  const s = v.trim();
  return s.endsWith("ms") ? parseFloat(s) : parseFloat(s) * 1000;
}

/** Split a comma list, respecting parentheses (linear(...) contains commas). */
function splitTop(s: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

interface Found {
  el: Element;
  rows: { prop: string; dur: number; ease: string }[];
  note?: string;
}

function find(el: Element | null): Found | null {
  for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
    const explicit = e.getAttribute("data-inspect");
    if (explicit) {
      try {
        const d = JSON.parse(explicit);
        return { el: e, rows: [{ prop: d.prop ?? "motion", dur: d.duration ?? 0, ease: d.easing ?? "linear" }], note: d.note };
      } catch {
        return { el: e, rows: [], note: explicit };
      }
    }
    const cs = getComputedStyle(e);
    const durs = splitTop(cs.transitionDuration).map(parseMs);
    if (durs.some((d) => d > 0)) {
      const props = splitTop(cs.transitionProperty);
      const eases = splitTop(cs.transitionTimingFunction);
      const rows = props
        .map((prop, i) => ({ prop, dur: durs[i % durs.length], ease: eases[i % eases.length] }))
        .filter((r) => r.dur > 0);
      return { el: e, rows };
    }
    if (cs.animationName && cs.animationName !== "none") {
      return {
        el: e,
        rows: [{ prop: `@${cs.animationName}`, dur: parseMs(splitTop(cs.animationDuration)[0]), ease: splitTop(cs.animationTimingFunction)[0] }],
      };
    }
  }
  return null;
}

function curvePath(ease: string): string {
  let fn: (x: number) => number;
  try {
    fn = parseEasing(ease);
  } catch {
    fn = (x) => x;
  }
  const w = 64;
  const h = 40;
  let d = "";
  for (let i = 0; i <= 48; i++) {
    const x = i / 48;
    const y = fn(x);
    d += `${i ? "L" : "M"}${(x * w).toFixed(1)},${(h - y * h).toFixed(1)}`;
  }
  return d;
}

function render(f: Found) {
  if (!panel) return;
  const rows = f.rows
    .slice(0, 4)
    .map((r) => {
      const dt = tokenForDuration(Math.round(r.dur));
      const et = tokenForEasing(r.ease);
      return `<div><span class="k">${r.prop}</span> ${Math.round(r.dur)}ms${dt ? ` <span class="k">${dt}</span>` : ""}<br><span class="k">curve</span> ${
        et ?? (r.ease.length > 38 ? r.ease.slice(0, 36) + "…" : r.ease)
      }</div>`;
    })
    .join("");
  const main = f.rows[0];
  const svg = main
    ? `<svg width="64" height="40" viewBox="-2 -6 68 52" aria-hidden="true"><path d="M0,40H64M0,40V0" stroke="var(--graphite)" fill="none" stroke-width="1"/><path d="${curvePath(main.ease)}" stroke="var(--blue-pencil)" fill="none" stroke-width="1.5"/></svg>`
    : "";
  panel.innerHTML = `${rows}${f.note ? `<div class="k">${f.note}</div>` : ""}${svg}`;
}

function place() {
  if (!panel) return;
  const pad = 14;
  const r = panel.getBoundingClientRect();
  let x = lastPointer.x + pad;
  let y = lastPointer.y + pad;
  if (x + r.width > innerWidth - 8) x = lastPointer.x - r.width - pad;
  if (y + r.height > innerHeight - 8) y = lastPointer.y - r.height - pad;
  panel.style.left = `${Math.max(8, x)}px`;
  panel.style.top = `${Math.max(8, y)}px`;
}

function update() {
  if (!active) return;
  const target = document.elementFromPoint(lastPointer.x, lastPointer.y);
  const f = target ? find(target) : null;
  if (outlined && outlined !== f?.el) outlined.classList.remove("inspect-outline");
  if (!f) {
    panel?.remove();
    panel = null;
    outlined = null;
    return;
  }
  if (!panel) {
    panel = document.createElement("div");
    panel.className = "inspector";
    panel.setAttribute("role", "status");
    document.body.appendChild(panel);
  }
  f.el.classList.add("inspect-outline");
  outlined = f.el;
  render(f);
  place();
}

function stop() {
  active = false;
  panel?.remove();
  panel = null;
  outlined?.classList.remove("inspect-outline");
  outlined = null;
}

let installed = false;
export function installInspector() {
  if (installed) return;
  installed = true;
  addEventListener("pointermove", (e) => {
    lastPointer = { x: e.clientX, y: e.clientY };
    if (e.altKey && !active) active = true;
    if (!e.altKey && active) stop();
    if (active) update();
  });
  addEventListener("keydown", (e) => {
    if (e.key === "Alt") {
      active = true;
      update();
    }
  });
  addEventListener("keyup", (e) => {
    if (e.key === "Alt") stop();
  });
  addEventListener("blur", stop);
}
