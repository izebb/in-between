/**
 * Index vignettes: one small screen per chapter, where a piece of interface acts out the chapter's idea.
 *
 * House rules, so the twenty-five read as one set:
 * - One stage. Every scene plays on the same screen: a rounded well a shade off the page with a
 *   hairline edge, the scene clipped inside it (paint()). The screen is the viewport, so things
 *   arrive from its edges, as they would in an app.
 * - One kit. Paper cards with a soft shadow, text as placeholder bars (headings darker), a pale tint
 *   for images and avatars, switches, knobs, and one pointer: the helpers below, and nothing else.
 * - Colour has jobs. Red is the subject, the one thing to watch. Blue pencil is notation only
 *   (ghosts, trails, dashed "was here" outlines, spacing ticks): thin strokes, never a fill.
 * - Time. A scene is a loop of `period` seconds and t = 0 is its rest pose: the telling still, and
 *   all that reduced motion sees. The loop leaves from it and comes back to it, so hovering never
 *   jumps; notation that belongs to the still fades as the action starts and returns as it ends.
 * - Motion. The site's own curves (enters ease out, exits ease in and run quicker, moves on screen
 *   ease in-out) and the core's spring model.
 */
import { cubicBezier, spring, fromResponse } from "@inbetween/core";
import { easing } from "~/motion/tokens";

export const VW = 176;
export const VH = 64;
/** The screen's corner radius. */
const SR = 8;

export interface Palette {
  ink: string;
  graphite: string;
  blue: string;
  red: string;
  paper: string;
  raised: string;
  dark: boolean;
  /** The screen's ground, a shade off the page, and the hairline round it and its cards. */
  well: string;
  edge: string;
  /** Placeholder text: headings, and body lines. */
  head: string;
  body: string;
  /** Neutral UI fill: tracks, empty cells, a switch that is off. */
  fill: string;
  /** Pale tints for images and avatars; the deeper one for shapes inside them. */
  tint: string;
  tintDeep: string;
  /** Red, washed out: a selected row. */
  redWash: string;
  shadow: string;
  /** The reading mono, for the one scene that labels something. */
  mono: string;
}

export interface V {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  c: Palette;
}

export interface Vignette {
  /** Loop length in seconds. */
  period: number;
  /** t runs 0 → 1 over the period; 0 is the rest pose. */
  draw(v: V, t: number): void;
}

export function readPalette(el: Element = document.documentElement): Palette {
  const s = getComputedStyle(el);
  const g = (n: string) => s.getPropertyValue(n).trim();
  const ink = g("--ink"), paper = g("--paper"), raised = g("--paper-raised"), rule = g("--rule");
  const blue = g("--blue-pencil"), red = g("--red-pencil");
  const dark = luminance(paper) < 0.3;
  return {
    ink,
    graphite: g("--graphite"),
    blue,
    red,
    paper,
    raised,
    dark,
    well: dark ? mix(paper, "#000000", 0.4) : mix(paper, ink, 0.035),
    edge: mix(rule, ink, dark ? 0.1 : 0.05),
    head: rgba(ink, dark ? 0.6 : 0.55),
    body: rgba(ink, dark ? 0.2 : 0.14),
    fill: rgba(ink, dark ? 0.14 : 0.09),
    tint: mix(blue, raised, dark ? 0.66 : 0.78),
    tintDeep: mix(blue, raised, dark ? 0.42 : 0.52),
    redWash: mix(red, raised, dark ? 0.78 : 0.86),
    shadow: dark ? "rgba(0,0,0,0.55)" : "rgba(20,20,30,0.16)",
    mono: g("--font-mono") || "ui-monospace, monospace",
  };
}

function luminance(color: string): number {
  const m = color.match(/#([0-9a-f]{6})/i);
  if (!m) return 1;
  const n = parseInt(m[1], 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

/** Mix two #rrggbb colours; the result is #rrggbb too, so mixes can be mixed. */
export function mix(a: string, b: string, t: number): string {
  const pa = a.match(/^#([0-9a-f]{6})$/i);
  const pb = b.match(/^#([0-9a-f]{6})$/i);
  if (!pa || !pb) return a;
  const na = parseInt(pa[1], 16);
  const nb = parseInt(pb[1], 16);
  const ch = (s: number) => Math.round(lerp((na >> s) & 255, (nb >> s) & 255, t));
  return "#" + [16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("");
}

function rgba(hex: string, a: number): string {
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/* ---------------------------------------------------------------- timing */

const TAU = Math.PI * 2;
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Local progress of t inside [a, b]. */
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOut = cubicBezier(...easing.out);
export const easeIn = cubicBezier(...easing.in);
export const easeInOut = cubicBezier(...easing.inout);
/** 0 → 1 → 0 across [a, b]: a press, a pulse. */
const pulse = (t: number, a: number, b: number) => Math.sin(seg(t, a, b) * Math.PI);
/** Notation that belongs to the still: fades out by `out`, back in from `back`. */
const note = (t: number, out = 0.08, back = 0.9) => Math.max(1 - seg(t, out - 0.05, out), seg(t, back, back + 0.07));

/** A spring's position (0 → 1, overshooting when bounce > 0) against seconds since it let go. */
function springAt(response: number, bounce: number) {
  const s = spring(fromResponse(response, bounce));
  const T = s.settleTime();
  const at = (sec: number) => (sec <= 0 ? 0 : sec >= T ? 1 : s.position(sec));
  let max = 1;
  for (let k = 0; k <= 240; k++) max = Math.max(max, at((k / 240) * T));
  return Object.assign(at, { T, max });
}

/** A stable pseudo-random number in [0, 1) for an index: the same every loop. */
const hash = (i: number, n = 0) => {
  const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/* ---------------------------------------------------------------- the kit */

export function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const k = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.arcTo(x + w, y, x + w, y + h, k);
  ctx.arcTo(x + w, y + h, x, y + h, k);
  ctx.arcTo(x, y + h, x, y, k);
  ctx.arcTo(x, y, x + w, y, k);
  ctx.closePath();
}

/** Canvas shadows ignore the transform: scale them by it, so they look the same at any pixel ratio. */
function shade(ctx: CanvasRenderingContext2D, c: Palette, blur: number, dy: number) {
  const m = ctx.getTransform();
  const k = Math.hypot(m.a, m.b);
  ctx.shadowColor = c.shadow;
  ctx.shadowBlur = blur * k;
  ctx.shadowOffsetY = dy * k;
}

/** A paper card: raised fill, hairline edge, a soft shadow that grows with lift. */
export function card(v: V, x: number, y: number, w: number, h: number, o: { r?: number; lift?: number; alpha?: number; fill?: string } = {}) {
  const { ctx, c } = v;
  const r = o.r ?? 5;
  const lift = o.lift ?? 1;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  shade(ctx, c, 2 + 3 * lift, 0.5 + 1.25 * lift);
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = o.fill ?? c.raised;
  ctx.fill();
  ctx.shadowColor = "transparent";
  rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r - 0.5);
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/** Placeholder text: a rounded bar. */
export function bar(v: V, x: number, y: number, w: number, o: { h?: number; color?: string; alpha?: number } = {}) {
  if (w <= 0) return;
  const { ctx, c } = v;
  const h = o.h ?? 3;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  rr(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = o.color ?? c.body;
  ctx.fill();
  ctx.restore();
}

/** A heading: a darker, taller bar. */
const heading = (v: V, x: number, y: number, w: number, alpha = 1) => bar(v, x, y, w, { h: 4, color: v.c.head, alpha });

function dot(v: V, x: number, y: number, r: number, color: string, alpha = 1) {
  const { ctx } = v;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/** A filled rounded rect: an image block, a filled checkbox, a button. */
function block(v: V, x: number, y: number, w: number, h: number, r: number, color: string, alpha = 1) {
  const { ctx } = v;
  ctx.save();
  ctx.globalAlpha *= alpha;
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/** A raised round knob (a slider thumb, a switch's knob). */
function knob(v: V, x: number, y: number, r: number, fill = v.c.raised) {
  const { ctx, c } = v;
  ctx.save();
  shade(ctx, c, 3, 1);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.beginPath();
  ctx.arc(x, y, r - 0.5, 0, TAU);
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/** A switch, centred on y; `on` runs 0 → 1 (and past it, if a spring throws it). */
function toggle(v: V, x: number, y: number, on: number, o: { w?: number; h?: number; color?: string } = {}) {
  const { ctx, c } = v;
  const w = o.w ?? 24, h = o.h ?? 13;
  rr(ctx, x, y - h / 2, w, h, h / 2);
  ctx.fillStyle = c.fill;
  ctx.fill();
  const lit = clamp01(on);
  if (lit > 0) {
    ctx.save();
    ctx.globalAlpha *= lit;
    rr(ctx, x, y - h / 2, w, h, h / 2);
    ctx.fillStyle = o.color ?? c.red;
    ctx.fill();
    ctx.restore();
  }
  knob(v, x + h / 2 + on * (w - h), y, h / 2 - 1.5, c.dark ? mix(c.ink, c.raised, 0.12) : c.raised);
}

export function line(v: V, x1: number, y1: number, x2: number, y2: number, color: string, o: { width?: number; alpha?: number; dash?: number[] } = {}) {
  const { ctx } = v;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = o.width ?? 1;
  ctx.lineCap = "round";
  if (o.dash) ctx.setLineDash(o.dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

/** Blue pencil: an onion-skin ring. */
function ring(v: V, x: number, y: number, r: number, alpha = 0.55) {
  const { ctx, c } = v;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = c.blue;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

/** Blue pencil: the outline of a rect, dashed where something was (or will be), solid for a ghost. */
function pencilRect(v: V, x: number, y: number, w: number, h: number, r: number, alpha = 0.7, dashed = true) {
  const { ctx, c } = v;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (dashed) ctx.setLineDash([2, 2.5]);
  ctx.strokeStyle = c.blue;
  ctx.lineWidth = 1;
  rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r);
  ctx.stroke();
  ctx.restore();
}

/** Blue pencil: a small arrow from one point to another. */
function pencilArrow(v: V, x1: number, y1: number, x2: number, y2: number, alpha = 0.75) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const o = { alpha, width: 1.1 };
  line(v, x1, y1, x2, y2, v.c.blue, o);
  line(v, x2, y2, x2 - 3 * Math.cos(a - 0.6), y2 - 3 * Math.sin(a - 0.6), v.c.blue, o);
  line(v, x2, y2, x2 - 3 * Math.cos(a + 0.6), y2 - 3 * Math.sin(a + 0.6), v.c.blue, o);
}

/** A chevron; `turn` 0 points down, 1 points up. */
function chevron(v: V, x: number, y: number, turn: number, color: string, size = 2.5) {
  const { ctx } = v;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(turn * Math.PI);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-size, -size / 2);
  ctx.lineTo(0, size / 2);
  ctx.lineTo(size, -size / 2);
  ctx.stroke();
  ctx.restore();
}

/** The pointer. `press` squeezes it a little, as a click does. */
function pointer(v: V, x: number, y: number, o: { press?: number; alpha?: number } = {}) {
  const alpha = o.alpha ?? 1;
  if (alpha <= 0) return;
  const { ctx, c } = v;
  const k = 1 - (o.press ?? 0) * 0.12;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 13);
  ctx.lineTo(3.4, 10);
  ctx.lineTo(5.8, 15);
  ctx.lineTo(7.6, 14.2);
  ctx.lineTo(5.3, 9.3);
  ctx.lineTo(9.6, 9.3);
  ctx.closePath();
  shade(ctx, c, 1.5, 0.5);
  ctx.fillStyle = c.ink;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = c.dark ? c.well : c.raised;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/** An image placeholder: a card holding a tinted landscape, a sun and two hills. */
function photo(v: V, x: number, y: number, w: number, h: number, o: { r?: number; lift?: number; sun?: string; alpha?: number } = {}) {
  const { ctx, c } = v;
  const r = o.r ?? 4;
  ctx.save();
  ctx.globalAlpha *= o.alpha ?? 1;
  card(v, x, y, w, h, { r, lift: o.lift ?? 0.4 });
  rr(ctx, x + 1.5, y + 1.5, w - 3, h - 3, Math.max(0, r - 1));
  ctx.clip();
  ctx.fillStyle = c.tint;
  ctx.fillRect(x, y, w, h);
  dot(v, x + w * 0.72, y + h * 0.34, h * 0.13, o.sun ?? c.red);
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w * 0.35, y + h * 0.52);
  ctx.lineTo(x + w * 0.6, y + h * 0.8);
  ctx.lineTo(x + w * 0.78, y + h * 0.62);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fillStyle = c.tintDeep;
  ctx.fill();
  ctx.restore();
}

/** Scale about a point for the duration of fn. */
function about(ctx: CanvasRenderingContext2D, x: number, y: number, sx: number, sy: number, fn: () => void) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  ctx.translate(-x, -y);
  fn();
  ctx.restore();
}

/** Draw one vignette on its screen: the well, the scene clipped inside it, the edge over both. */
export function paint(ctx: CanvasRenderingContext2D, key: string, t: number, c: Palette) {
  const v: V = { ctx, w: VW, h: VH, c };
  ctx.save();
  rr(ctx, 0.5, 0.5, VW - 1, VH - 1, SR);
  ctx.fillStyle = c.well;
  ctx.fill();
  ctx.clip();
  vignettes[key]?.draw(v, t);
  ctx.restore();
  ctx.save();
  rr(ctx, 0.5, 0.5, VW - 1, VH - 1, SR);
  ctx.strokeStyle = c.edge;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/* ---------------------------------------------------------------- springs the scenes share */

const springs = {
  pop: springAt(0.55, 0.45), // a notification landing, running visibly past its place
  badge: springAt(0.3, 0.45), // a small thing popping on
  light: springAt(0.3, 0.38), // a light chip: quick, a touch of overshoot
  chip: springAt(0.42, 0.4), // action chips thrown out along their arcs
  fab: springAt(0.35, 0.3),
  bold: springAt(0.5, 0.25), // an entrance with full motion
  button: springAt(0.35, 0.4),
  token: springAt(0.45, 0.38), // the motion token, once it's a spring
};

/* ---------------------------------------------------------------- scenes */

export const vignettes: Record<string, Vignette> = {
  /** 01 · Motion is information: every change has a cause. A press closes the menu into its button;
   *  a press grows it back out of the button; the pointer settles on a row. */
  information: {
    period: 3.4,
    draw(v, t) {
      const { ctx, c } = v;
      const bw = 46, bh = 14, mw = 76, mh = 31;
      const x = Math.round((VW - mw) / 2), by = 7, my = by + bh + 3;
      const onBtn = { x: x + 30, y: by + 8 }, onRow = { x: x + 52, y: my + 17 };
      const there = t < 0.5 ? easeInOut(seg(t, 0.06, 0.22)) : 1 - easeInOut(seg(t, 0.68, 0.84));
      const press = Math.max(pulse(t, 0.23, 0.29), pulse(t, 0.49, 0.55));
      const open = t < 0.42 ? 1 - easeIn(seg(t, 0.26, 0.34)) : easeOut(seg(t, 0.52, 0.67));
      const hover = t < 0.5 ? 1 - seg(t, 0.07, 0.13) : seg(t, 0.8, 0.86);

      // The button gives a little under the press; its chevron says which way the menu is.
      about(ctx, x + bw / 2, by + bh / 2, 1 - press * 0.05, 1 - press * 0.05, () => {
        card(v, x, by, bw, bh, { r: 5, lift: 0.5 - press * 0.4 });
        bar(v, x + 7, by + 5.5, 22, { color: c.head });
        chevron(v, x + bw - 9, by + bh / 2, open, c.graphite);
      });
      // The menu grows out of the button that caused it, and goes back into it.
      if (open > 0.001) {
        ctx.save();
        ctx.globalAlpha *= clamp01(open * 1.6);
        about(ctx, x + bw / 2, my, lerp(0.8, 1, open), lerp(0.5, 1, open), () => {
          card(v, x, my, mw, mh, { r: 6, lift: 1 });
          [0, 1, 2].forEach((i) => {
            const ry = my + 7 + i * 8.5;
            if (i === 1 && hover > 0) {
              ctx.save();
              ctx.globalAlpha *= hover;
              block(v, x + 3, ry - 3.5, mw - 6, 7.5, 2.5, c.redWash);
              ctx.restore();
            }
            dot(v, x + 9, ry, 2, c.tintDeep);
            if (i === 1) dot(v, x + 9, ry, 2, c.red, hover);
            bar(v, x + 15, ry - 1.5, [38, 48, 30][i]);
          });
        });
        ctx.restore();
      }
      pointer(v, lerp(onRow.x, onBtn.x, there), lerp(onRow.y, onBtn.y, there), { press });
    },
  },

  /** 02 · Timing: the same switch, flipped in 6 frames and in 18. Count the frames: that's duration,
   *  and it's the difference between a flick and a heave. */
  timing: {
    period: 3.2,
    draw(v, t) {
      const { c } = v;
      const T = 3.2, FPS = 20, flips = [0.1, 0.55]; // off, then on
      const sx = 18, cx0 = 56, pitch = 5.5, cw = 3.5;
      [
        { y: 21, frames: 6 },
        { y: 43, frames: 18 },
      ].forEach(({ y, frames }) => {
        // Which flip is showing: before the first, the last loop's "on" (long finished).
        const k = t >= flips[1] ? 1 : t >= flips[0] ? 0 : -1;
        const start = k < 0 ? flips[1] - 1 : flips[k];
        const sec = (t - start) * T;
        const u = clamp01(sec / (frames / FPS));
        toggle(v, sx, y, k === 0 ? 1 - easeInOut(u) : easeInOut(u));
        // One cell per frame the flip takes, filled as each frame is shown; the current one red.
        const shown = Math.min(frames, Math.floor(sec * FPS) + 1);
        for (let i = 0; i < frames; i++) {
          block(v, cx0 + i * pitch, y - 5, cw, 10, 1.5, i >= shown ? c.fill : i === shown - 1 && u < 1 ? c.red : c.graphite);
        }
      });
    },
  },

  /** 03 · Spacing: a slider thumb eases to its value. Its frames, as onion skin on the track and as
   *  an animator's spacing chart under it, bunch up where it slows. Easing is spacing. */
  spacing: {
    period: 3.2,
    draw(v, t) {
      const { ctx, c } = v;
      const x0 = 22, x1 = 154, y = 30, chartY = 50, frames = 12;
      const at = (p: number) => lerp(x0, x1, lerp(0.1, 0.84, p));
      const going = t >= 0.3;
      const u = seg(t, 0.34, 0.74);
      const p = going ? easeOut(u) : 1 - easeInOut(seg(t, 0.1, 0.24));
      const tx = at(p);
      block(v, x0, y - 2, x1 - x0, 4, 2, c.fill);
      block(v, x0, y - 2, tx - x0, 4, 2, c.head);
      // The chart: all of it at rest, none on the way back, each frame as the thumb passes it.
      const shown = going ? Math.floor(u * frames) + 1 : frames + 1;
      const na = going ? 1 : 1 - seg(t, 0.03, 0.09);
      if (na > 0) {
        ctx.save();
        ctx.globalAlpha *= na;
        line(v, at(0), chartY, at(1), chartY, c.graphite, { alpha: 0.5 });
        for (let f = 0; f <= frames && f < shown; f++) {
          const fx = at(easeOut(f / frames));
          const key = f === 0 || f === frames;
          ring(v, fx, y, 6.5, 0.4);
          line(v, fx, chartY - (key ? 5 : 3.5), fx, chartY + (key ? 5 : 3.5), c.blue, { width: key ? 1.4 : 1 });
        }
        ctx.restore();
      }
      knob(v, tx, y, 7);
      dot(v, tx, y, 2.6, c.red);
      card(v, tx - 13, y - 23, 26, 12, { r: 4, lift: 0.4 });
      bar(v, tx - 8, y - 18.5, 6 + 10 * p, { color: c.red });
    },
  },

  /** 04 · Weight: a chip and a sheet rise the same distance from the screen's edge. The chip is quick
   *  and springs; the sheet takes its time and never bounces. Their spacing ticks show why. */
  weight: {
    period: 3.4,
    draw(v, t) {
      const { ctx, c } = v;
      const T = 3.4, D = 56, start = 0.28;
      const light = springs.light;
      const heavy = (sec: number) => easeInOut(clamp01(sec / 1.1));
      const chip = { x: 22, y: 30, w: 46, h: 16 };
      const sheet = { x: 88, y: 14, w: 72, h: 56 };
      const off = (p: (sec: number) => number) => (t < 0.22 ? D * easeIn(seg(t, 0.06, 0.15)) : D * (1 - p((t - start) * T)));
      // Spacing ticks along each one's path, one per frame (at 15 fps)
      const na = note(t, 0.07);
      if (na > 0) {
        ctx.save();
        ctx.globalAlpha *= na;
        const ticks = (o: { x: number; y: number }, p: (sec: number) => number, secs: number) => {
          line(v, o.x - 7, o.y - 3, o.x - 7, VH, c.graphite, { alpha: 0.5 });
          for (let f = 0; f <= secs * 15; f++) {
            const yy = o.y + D * (1 - p(f / 15));
            if (yy < VH - 2) line(v, o.x - 9.5, yy, o.x - 4.5, yy, c.blue);
          }
        };
        ticks(chip, light, light.T);
        ticks(sheet, heavy, 1.1);
        ctx.restore();
      }
      const ly = chip.y + off(light);
      card(v, chip.x, ly, chip.w, chip.h, { r: 8, lift: 0.5 });
      dot(v, chip.x + 9, ly + chip.h / 2, 3, c.red);
      bar(v, chip.x + 16, ly + chip.h / 2 - 1.5, 22);
      const hy = sheet.y + off(heavy);
      card(v, sheet.x, hy, sheet.w, sheet.h, { r: 8, lift: 1.2 });
      bar(v, sheet.x + sheet.w / 2 - 8, hy + 4, 16, { h: 2.5, color: c.fill });
      block(v, sheet.x + 8, hy + 10, sheet.w - 16, 13, 3, c.tint);
      heading(v, sheet.x + 8, hy + 28, 40);
      bar(v, sheet.x + 8, hy + 35, 52);
      bar(v, sheet.x + 8, hy + 43, 24, { h: 6, color: c.red });
    },
  },

  /** 05 · Springs: a notification drops in from the top of the screen on a spring, runs past its place
   *  and settles; the dashed outline is how far past it ran. The badge lands last. */
  springs: {
    period: 3.2,
    draw(v, t) {
      const { ctx, c } = v;
      const T = 3.2, W = 116, H = 32, x = (VW - W) / 2, rest = 16, D = 52, start = 0.3;
      const p = t < 0.22 ? 1 - easeIn(seg(t, 0.07, 0.15)) : springs.pop((t - start) * T);
      const y = rest - D * (1 - p);
      const na = note(t);
      if (na > 0) pencilRect(v, x, rest + D * (springs.pop.max - 1), W, H, 7, 0.7 * na);
      card(v, x, y, W, H, { r: 7, lift: 0.8 });
      dot(v, x + 16, y + H / 2, 7, c.tint);
      heading(v, x + 29, y + 8, 44);
      bar(v, x + 29, y + 16, 64);
      bar(v, x + 29, y + 22, 40);
      bar(v, x + W - 22, y + 8.5, 12, { h: 2.5 });
      const b = t < 0.22 ? 1 - easeIn(seg(t, 0.05, 0.1)) : springs.badge((t - start - 0.14) * T);
      if (b > 0.01) {
        about(ctx, x + W - 4, y + 4, b, b, () => dot(v, x + W - 4, y + 4, 4.5, c.red));
      }
    },
  },

  /** 06 · Momentum and friction: a carousel is grabbed and flicked. It glides on what the flick gave
   *  it, friction bleeding the speed away, and lands where the throw said it would: the red card
   *  in the slot. */
  momentum: {
    period: 3.4,
    draw(v, t) {
      const { ctx, c } = v;
      const cw = 30, ch = 34, pitch = 40, y = 14, slot = (VW - cw) / 2;
      const travel = 4 * pitch, pull = 24, rel = 0.24, lam = 3.5;
      // Dragged 1:1, speeding up, then let go; the glide decays exponentially from that speed.
      const dragged = pull * seg(t, 0.12, rel) ** 3;
      const s = t < rel ? dragged : pull + ((travel - pull) * (1 - Math.exp(-lam * seg(t, rel, 0.9)))) / (1 - Math.exp(-lam));
      pencilRect(v, slot - 4, y - 4, cw + 8, ch + 8, 7, 0.75);
      const first = Math.floor((s - slot) / pitch) - 1;
      for (let i = first; i < first + 7; i++) {
        const x = slot + i * pitch - s;
        if (x > VW || x + cw < 0) continue;
        card(v, x, y, cw, ch, { r: 5, lift: 0.5 });
        block(v, x + 4, y + 4, cw - 8, 16, 2.5, (((i % 4) + 4) % 4 === 0) ? c.red : c.tint);
        bar(v, x + 4, y + 24, cw - 12, { h: 2.5 });
      }
      // Cards pass under the screen's edges
      for (const [a, b] of [[0, 16], [VW, VW - 16]]) {
        const g = ctx.createLinearGradient(a, 0, b, 0);
        g.addColorStop(0, c.well);
        g.addColorStop(1, rgba(c.well, 0));
        ctx.fillStyle = g;
        ctx.fillRect(Math.min(a, b), 0, 16, VH);
      }
      const follow = t < rel ? dragged : pull + 10 * easeOut(seg(t, rel, 0.32));
      pointer(v, 126 - follow, y + ch - 8, { press: t > 0.1 && t < rel ? 1 : 0, alpha: seg(t, 0.03, 0.09) * (1 - seg(t, 0.28, 0.36)) });
    },
  },

  /** 07 · The twelve, translated: a floating action button squashes before it acts (anticipation),
   *  its actions swing out on arcs, each a beat behind the last (overlap, follow-through), and the
   *  page steps back behind a scrim (staging). */
  twelve: {
    period: 3.4,
    draw(v, t) {
      const { ctx, c } = v;
      const T = 3.4, fx = VW - 26, fy = VH - 20, R = 9.5, go = 0.54;
      const opening = t >= 0.3;
      const open = (i: number) => (opening ? springs.chip((t - go - i * 0.045) * T) : 1 - easeIn(seg(t, 0.1 + (2 - i) * 0.03, 0.17 + (2 - i) * 0.03)));
      const turn = opening ? springs.fab((t - go) * T) : 1 - easeInOut(seg(t, 0.1, 0.22));
      const squash = opening ? (t < go ? easeIn(seg(t, 0.42, go)) : -0.45 * pulse(t, go, go + 0.08)) : 0.5 * pulse(t, 0.06, 0.12);
      // The page behind
      heading(v, 14, 9, 50);
      [22, 34, 46].forEach((ry, i) => {
        dot(v, 18, ry + 2, 4, c.tint);
        bar(v, 27, ry - 1, [70, 58, 76][i]);
        bar(v, 27, ry + 4, [40, 52, 34][i]);
      });
      const scrim = clamp01(Math.max(open(0), open(2)));
      if (scrim > 0) {
        ctx.fillStyle = rgba(c.well, 0.62 * scrim);
        ctx.fillRect(0, 0, VW, VH);
      }
      // The actions, thrown out along arcs
      [0, 1, 2].forEach((i) => {
        const p = open(i);
        if (p <= 0.001) return;
        const a = Math.PI * (1 + i * 0.25) - (1 - p) * 0.7;
        const x = fx + Math.cos(a) * 30 * p, y = fy + Math.sin(a) * 30 * p;
        ctx.save();
        ctx.globalAlpha *= clamp01(p * 2);
        const k = lerp(0.4, 1, clamp01(p));
        about(ctx, x, y, k, k, () => {
          knob(v, x, y, 7);
          block(v, x - 2.5, y - 2.5, 5, 5, 1.5, c.tintDeep);
        });
        ctx.restore();
      });
      // The button: squashes into the press, stretches on the way out; its plus turns to a cross.
      ctx.save();
      ctx.translate(fx, fy + R);
      ctx.scale(1 + squash * 0.12, 1 - squash * 0.14);
      ctx.translate(0, -R);
      shade(ctx, c, 4, 1.5);
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, TAU);
      ctx.fillStyle = c.red;
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.rotate((turn * Math.PI) / 4);
      line(v, -4, 0, 4, 0, "#ffffff", { width: 1.8 });
      line(v, 0, -4, 0, 4, "#ffffff", { width: 1.8 });
      ctx.restore();
    },
  },

  /** 08 · Stagger and hierarchy: a list leaves all at once (exits don't queue), then arrives in reading
   *  order: the heading leads, the rows follow one beat apart. At rest, its exposure sheet. */
  stagger: {
    period: 3.2,
    draw(v, t) {
      const { c } = v;
      const x0 = 16;
      const out = easeIn(seg(t, 0.06, 0.13));
      const enter = (i: number) => easeOut(seg(t, 0.24 + i * 0.055, 0.4 + i * 0.055));
      const vis = (i: number) => (t < 0.2 ? 1 - out : enter(i));
      const dy = (i: number) => (t < 0.2 ? out * 2 : (1 - enter(i)) * 6);
      heading(v, x0, 8 + dy(0), 54, vis(0));
      for (let i = 1; i <= 4; i++) {
        const ry = 20 + (i - 1) * 10.5 + dy(i);
        dot(v, x0 + 3, ry + 1.5, 3.3, i === 1 ? c.red : c.tint, vis(i));
        bar(v, x0 + 11, ry, [58, 48, 64, 40][i - 1], { alpha: vis(i) });
      }
      // Who leads, who follows: each element's start, a beat after the last
      const na = note(t, 0.08, 0.86);
      if (na > 0) {
        for (let i = 0; i <= 4; i++) {
          const ry = i === 0 ? 10 : 21.5 + (i - 1) * 10.5;
          line(v, 118 + i * 7, ry, 140 + i * 7, ry, c.blue, { alpha: 0.75 * na, width: 1.4 });
        }
      }
    },
  },

  /** 09 · Enter, exit, change: a toast leaves quickly, arrives generously from the edge it belongs to,
   *  and changes in place: its spinner becomes a tick. */
  "enter-exit": {
    period: 3.4,
    draw(v, t) {
      const { ctx, c } = v;
      const W = 118, H = 24, x = (VW - W) / 2, rest = (VH - H) / 2;
      const exit = easeIn(seg(t, 0.07, 0.14));
      const enter = easeOut(seg(t, 0.26, 0.46));
      const y = t < 0.2 ? rest + exit * 20 : rest + (1 - enter) * (VH - rest + 2);
      const alpha = t < 0.2 ? 1 - exit : clamp01(enter * 1.6);
      const done = t < 0.2 ? 1 : easeOut(seg(t, 0.64, 0.74));
      const na = note(t, 0.07);
      if (na > 0) pencilArrow(v, VW / 2, VH - 3, VW / 2, rest + H + 5, 0.7 * na);
      ctx.save();
      ctx.globalAlpha *= alpha;
      card(v, x, y, W, H, { r: 12, lift: 0.8 });
      const ix = x + 14, iy = y + H / 2;
      if (done < 1) {
        ctx.save();
        ctx.globalAlpha *= 1 - done;
        ctx.strokeStyle = c.graphite;
        ctx.lineWidth = 1.8;
        ctx.lineCap = "round";
        ctx.beginPath();
        const spin = t * TAU * 3;
        ctx.arc(ix, iy, 5.5, spin, spin + Math.PI * 1.4);
        ctx.stroke();
        ctx.restore();
      }
      if (done > 0) {
        dot(v, ix, iy, 7 * (0.6 + 0.4 * done), c.red, done);
        const a = { x: ix - 3, y: iy }, b = { x: ix - 1, y: iy + 2 }, e = { x: ix + 3.5, y: iy - 2.5 };
        const k = clamp01(done * 1.4 - 0.2);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.6;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(lerp(a.x, b.x, clamp01(k * 2)), lerp(a.y, b.y, clamp01(k * 2)));
        if (k > 0.5) ctx.lineTo(lerp(b.x, e.x, (k - 0.5) * 2), lerp(b.y, e.y, (k - 0.5) * 2));
        if (k > 0) ctx.stroke();
      }
      // Its words change with its state: "saving…" is longer than "saved"
      heading(v, x + 28, iy - 5, lerp(50, 34, done));
      bar(v, x + 28, iy + 2, 70);
      ctx.restore();
    },
  },

  /** 10 · Object permanence: a thumbnail grows into its own detail view (the same object, never a
   *  swap), then goes back into the place it kept. */
  permanence: {
    period: 3.4,
    draw(v, t) {
      const { c } = v;
      const tiles = [20, 68, 116].map((x) => ({ x, y: 18, w: 40, h: 28 }));
      const big = { x: 10, y: 6, w: 86, h: 52 };
      const p = easeInOut(seg(t, 0.1, 0.32)) * (1 - easeInOut(seg(t, 0.64, 0.84)));
      const sib = 1 - clamp01(p * 3);
      tiles.forEach((r, i) => {
        if (i !== 1 && sib > 0) photo(v, r.x, r.y, r.w, r.h, { sun: c.tintDeep, alpha: sib });
      });
      const a = tiles[1];
      const detail = easeOut(seg(t, 0.28, 0.4)) * (1 - easeIn(seg(t, 0.6, 0.65)));
      const kept = clamp01(p * 3) * (1 - detail);
      if (kept > 0.01) pencilRect(v, a.x - 3, a.y - 3, a.w + 6, a.h + 6, 6, 0.75 * kept);
      if (detail > 0) {
        [0, 1, 2, 3].forEach((i) => {
          const k = clamp01(detail * 1.4 - i * 0.12);
          const yy = [12, 22, 29, 36][i] + (1 - k) * 4;
          if (i === 0) heading(v, 106, yy, 44, k);
          else bar(v, 106, yy, [0, 54, 48, 52][i], { alpha: k });
        });
        bar(v, 106, 45 + (1 - detail) * 4, 30, { h: 8, color: c.red, alpha: detail });
      }
      photo(v, lerp(a.x, big.x, p), lerp(a.y, big.y, p), lerp(a.w, big.w, p), lerp(a.h, big.h, p), { r: lerp(4, 6, p), lift: 0.4 + p });
    },
  },

  /** 11 · Spatial models: the app as a place. A detail screen pushes in from the right while the list
   *  steps back and dims; back returns the way it came. Direction means forward and back. */
  spatial: {
    period: 3.4,
    draw(v, t) {
      const { ctx, c } = v;
      // How far the detail screen has pushed in (0 → 1): pushes span 0.8 → 1.2, so rest is mid-push.
      const P = t < 0.2 ? easeInOut((t + 0.2) / 0.4) : t < 0.38 ? 1 : t < 0.54 ? 1 - easeInOut(seg(t, 0.38, 0.54)) : t < 0.8 ? 0 : easeInOut((t - 0.8) / 0.4);
      // The list, behind
      const ax = -52 * P;
      heading(v, ax + 14, 8, 40);
      [22, 34, 46].forEach((ry, i) => {
        block(v, ax + 14, ry - 4, 9, 9, 2, i === 1 ? c.red : c.tint);
        bar(v, ax + 28, ry - 1.5, [60, 72, 52][i]);
        chevron(v, ax + 158, ry, -0.5, c.graphite, 2.2);
      });
      if (P > 0) {
        ctx.fillStyle = rgba(c.well, 0.55 * P);
        ctx.fillRect(0, 0, VW, VH);
      }
      // The detail, on top, casting its edge over the list
      const bx = VW * (1 - P);
      if (P > 0.001) {
        card(v, bx, 0, VW + 12, VH, { r: SR, lift: 1.4 });
        chevron(v, bx + 13, 10, 0.5, c.ink, 2.4);
        heading(v, bx + 22, 8, 36);
        photo(v, bx + 12, 19, 62, 38, { lift: 0.2 });
        heading(v, bx + 84, 21, 46);
        bar(v, bx + 84, 29, 62);
        bar(v, bx + 84, 35, 52);
        bar(v, bx + 84, 41, 58);
      }
      // The pointer taps back, then the row again
      const back = { x: 14, y: 12 }, row = { x: 104, y: 36 };
      const alpha = seg(t, 0.2, 0.25) * (1 - seg(t, 0.84, 0.9));
      if (alpha > 0) {
        const toBack = easeInOut(seg(t, 0.2, 0.32)), toRow = easeInOut(seg(t, 0.56, 0.7));
        const from = { x: 120, y: 44 };
        const px = t < 0.5 ? lerp(from.x, back.x, toBack) : lerp(back.x, row.x, toRow);
        const py = t < 0.5 ? lerp(from.y, back.y, toBack) : lerp(back.y, row.y, toRow);
        pointer(v, px, py, { press: Math.max(pulse(t, 0.33, 0.37), pulse(t, 0.73, 0.77)), alpha });
      }
    },
  },

  /** 12 · Direct manipulation: a card follows the finger 1:1, resists past the edge (rubber-banding),
   *  and on release carries the finger's speed into the spring that takes it home. */
  direct: {
    period: 3.4,
    draw(v, t) {
      const { ctx, c } = v;
      const W = 44, H = 30, y = 17, home = 14, gx = 28, edge = home + directLimit + W;
      const reach = (tt: number) => (directLimit + 44) * easeIn(seg(tt, 0.14, directRelease));
      let fx: number, cx: number, press = 0;
      if (t < directRelease) {
        fx = reach(t);
        cx = band(fx);
        press = t > 0.1 ? 1 : 0;
      } else {
        const r = directSpring();
        fx = reach(directRelease) * (1 - easeInOut(seg(t, 0.72, 0.94)));
        cx = r.position((t - directRelease) * 3.4);
      }
      line(v, edge + 0.5, 6, edge + 0.5, VH - 6, c.blue, { dash: [2, 3], alpha: 0.8 });
      // While it lags the finger, the pull between them
      const lag = fx - cx;
      if (t < directRelease && lag > 1) line(v, home + cx + gx, y + H / 2, home + fx + gx, y + H / 2, c.blue, { alpha: clamp01(lag / 10) * 0.8 });
      const stretch = t < directRelease ? 1 + 0.06 * clamp01(lag / 40) : 1;
      about(ctx, home + cx, y + H / 2, stretch, 1 / stretch, () => {
        card(v, home + cx, y, W, H, { r: 6, lift: 0.5 + press * 0.8 });
        heading(v, home + cx + 7, y + 8, 20);
        bar(v, home + cx + 7, y + 17, 28);
        dot(v, home + cx + W - 9, y + 9, 3.5, c.red);
      });
      pointer(v, home + fx + gx, y + H / 2 - 1, { press });
    },
  },

  /** 13 · Scroll as time: the page scrolls, and a pinned picture follows the scroll, not the clock:
   *  the sun rises as you go down and sets as you come back. */
  scroll: {
    period: 3.6,
    draw(v, t) {
      const { ctx, c } = v;
      const P =
        t < 0.08 ? 0.5
        : t < 0.36 ? lerp(0.5, 1, easeInOut(seg(t, 0.08, 0.36)))
        : t < 0.46 ? 1
        : t < 0.76 ? 1 - easeInOut(seg(t, 0.46, 0.76))
        : t < 0.82 ? 0
        : lerp(0, 0.5, easeInOut(seg(t, 0.82, 0.98)));
      // The text column scrolls
      const range = 104;
      for (let k = 0; k < 7; k++) {
        const by = 8 + k * 22 - P * range;
        if (by > VH || by < -16) continue;
        heading(v, 80, by, [44, 36, 52, 40, 48, 30, 42][k]);
        bar(v, 80, by + 8, 72);
        bar(v, 80, by + 13.5, 58);
      }
      // The pinned picture: driven by scroll position
      const im = { x: 12, y: 8, w: 56, h: 48 };
      card(v, im.x, im.y, im.w, im.h, { r: 5, lift: 0.4 });
      ctx.save();
      rr(ctx, im.x + 1.5, im.y + 1.5, im.w - 3, im.h - 3, 4);
      ctx.clip();
      const sky = ctx.createLinearGradient(0, im.y, 0, im.y + im.h);
      sky.addColorStop(0, mix(c.tint, c.raised, lerp(0, 0.6, P)));
      sky.addColorStop(1, c.raised);
      ctx.fillStyle = sky;
      ctx.fillRect(im.x, im.y, im.w, im.h);
      const sunLow = im.y + im.h - 6, sunHigh = im.y + 12;
      const na = note(t, 0.07);
      if (na > 0) line(v, im.x + im.w / 2, sunLow, im.x + im.w / 2, sunHigh, c.blue, { dash: [1.5, 2.5], alpha: 0.7 * na });
      dot(v, im.x + im.w / 2, lerp(sunLow, sunHigh, P), lerp(4, 6.5, P), c.red);
      ctx.beginPath();
      ctx.moveTo(im.x, im.y + im.h);
      ctx.quadraticCurveTo(im.x + im.w / 2, im.y + im.h - 22, im.x + im.w, im.y + im.h);
      ctx.fillStyle = c.tintDeep;
      ctx.fill();
      ctx.restore();
      // Reading progress along the top, and the scrollbar
      block(v, 0, 0, VW * P, 2, 1, c.head);
      block(v, VW - 6, 6 + P * 36, 2.5, 16, 1.25, c.graphite);
    },
  },

  /** 14 · The loop: one move, drawn at 60 frames a second and at 12. One glides, one steps (its
   *  frames left as onion skin), and they arrive together: each frame moves by the time that
   *  passed. Only dt survives. */
  loop: {
    period: 3,
    draw(v, t) {
      const { ctx, c } = v;
      const T = 3, x0 = 58, x1 = 156;
      // Out over [0.8, 1.3) (so rest is mid-move), back over [0.35, 0.65)
      const at = (sec: number) => {
        const u = (((sec / T) % 1) + 1) % 1;
        const f = u >= 0.8 ? u - 0.8 : u + 0.2;
        if (f <= 0.5) return easeInOut(f / 0.5);
        if (u < 0.35) return 1;
        if (u < 0.65) return 1 - easeInOut((u - 0.35) / 0.3);
        return 0;
      };
      const sec = t * T;
      line(v, x1 + 0.5, 10, x1 + 0.5, VH - 10, c.blue, { dash: [2, 2.5], alpha: 0.5 });
      [
        { fps: 60, y: 22 },
        { fps: 12, y: 42 },
      ].forEach(({ fps, y }) => {
        // When this row last drew: now, rounded down to its frame interval (offset, so the slow
        // row is caught between frames at rest).
        const phase = 0.6;
        const drawn = (Math.floor(sec * fps - phase) + phase) / fps;
        const p = at(drawn);
        block(v, 12, y - 6, 34, 12, 6, c.fill);
        ctx.save();
        ctx.font = `500 7px ${c.mono}`;
        ctx.fillStyle = c.head;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${fps} fps`, 29, y + 0.5);
        ctx.restore();
        block(v, x0, y - 2, x1 - x0, 4, 2, c.fill);
        block(v, x0, y - 2, Math.max(4, (x1 - x0) * p), 4, 2, c.head);
        if (fps < 30) {
          for (let back = 3; back >= 1; back--) {
            const fp = at(drawn - back / fps);
            if (Math.abs(fp - p) * (x1 - x0) > 2) ring(v, x0 + (x1 - x0) * fp, y, 5.5, 0.62 - back * 0.14);
          }
        }
        const kx = x0 + (x1 - x0) * p;
        knob(v, kx, y, 5.5);
        dot(v, kx, y, 2.2, c.red);
      });
    },
  },

  /** 15 · Easing by hand: a nav bar's hover highlight chases the pointer, covering a share of the gap
   *  each frame: x += (target − x) · k. Its ghosts close up as the gap does. */
  "easing-hand": {
    period: 3.6,
    draw(v, t) {
      const { c } = v;
      const T = 3.6, y = 32, items = [46, 88, 130];
      // The pointer's moves: to 0, to 1, to 2 (and it rests on 2)
      const target = (u: number) => {
        u = ((u % 1) + 1) % 1;
        let x = items[2], prev = 2;
        for (const [a, i] of [[0.3, 0], [0.58, 1], [0.86, 2]]) {
          if (u >= a) x = lerp(items[prev], items[i], easeInOut(seg(u, a, a + 0.07)));
          prev = i;
        }
        return x;
      };
      // Run the chase from a loop earlier, frame by frame, so it arrives at t already in step.
      const dt = 1 / 60, k = 1 - Math.exp(-7 * dt);
      const steps = Math.round(((1 + t) * T) / dt);
      let hx = items[2];
      const trail: number[] = [];
      for (let s = 0; s <= steps; s++) {
        hx += (target(s * dt / T - 1) - hx) * k;
        if (steps - s < 24 && (steps - s) % 3 === 0) trail.push(hx);
      }
      card(v, 16, y - 13, 144, 26, { r: 13, lift: 0.5 });
      trail.slice(0, -1).forEach((gx, i, arr) => {
        if (Math.abs(gx - hx) > 1.5) pencilRect(v, gx - 19, y - 9, 38, 18, 8.5, 0.15 + (0.4 * i) / arr.length, false);
      });
      block(v, hx - 19, y - 9, 38, 18, 9, c.redWash);
      items.forEach((ix) => {
        const near = clamp01(1 - Math.abs(ix - hx) / 20);
        bar(v, ix - 11, y - 1.5, 22, { color: near > 0.5 ? c.red : c.head, alpha: near > 0.5 ? 1 : 0.8 });
      });
      pointer(v, target(t) + 3, y + 1);
    },
  },

  /** 16 · Physics by hand: a badge on its lanyard. The pointer takes it by a corner, tugs it aside and
   *  lets go; strap and badge swing as a damped double pendulum, worked out a small step at a time,
   *  the badge a beat behind the strap. Its onion skin is those steps. */
  "physics-hand": {
    period: 3.8,
    draw(v, t) {
      const { ctx, c } = v;
      const T = 3.8, grab = 0.1, rel = 0.28;
      const px = VW / 2, py = -8, cw = 28, ch = 36, hy = 3;
      const { l1 } = LANYARD;
      // Angles from vertical, strap and badge: pulled out by the pointer, then let go into the swing
      const pose = (tt: number): [number, number] => {
        if (tt < rel) {
          const k = easeInOut(seg(tt, grab + 0.02, rel));
          return [LANYARD.a1 * k, LANYARD.a2 * k];
        }
        const [s1, s2] = lanyard((tt - rel) * T);
        const settle = 1 - easeInOut(seg(tt, 0.9, 0.99)); // the last of the swing, too small to see, set down exactly
        return [s1 * settle, s2 * settle];
      };
      const clipAt = (a1: number) => ({ x: px + l1 * Math.sin(a1), y: py + l1 * Math.cos(a1) });
      /** A point on the badge (in its own frame) in screen space. */
      const onBadge = (a1: number, a2: number, lx: number, ly: number) => {
        const q = clipAt(a1);
        return { x: q.x + lx * Math.cos(a2) + ly * Math.sin(a2), y: q.y - lx * Math.sin(a2) + ly * Math.cos(a2) };
      };
      const [a1, a2] = pose(t);
      // The still's notation: the arc it swings along
      const na = note(t, 0.08);
      if (na > 0) {
        ctx.save();
        ctx.globalAlpha *= 0.7 * na;
        ctx.setLineDash([2, 2.5]);
        ctx.strokeStyle = c.blue;
        ctx.beginPath();
        ctx.arc(px, py, l1 + hy + ch + 3, Math.PI / 2 - 0.55, Math.PI / 2 + 0.55);
        ctx.stroke();
        ctx.restore();
      }
      // Onion skin while it swings: where it was a few steps ago
      if (t > rel && t < 0.9) {
        for (let k = 3; k >= 1; k--) {
          const [g1, g2] = pose(t - k * 0.014);
          if (Math.abs(g2 - a2) < 0.03) continue;
          const q = clipAt(g1);
          ctx.save();
          ctx.translate(q.x, q.y);
          ctx.rotate(-g2);
          pencilRect(v, -cw / 2, hy, cw, ch, 4, 0.45 - k * 0.11, false);
          ctx.restore();
        }
      }
      // The strap, down from above the screen to its clip
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(-a1);
      ctx.strokeStyle = c.red;
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.quadraticCurveTo(-5, l1 * 0.6, -1.6, l1 - 1.5);
      ctx.moveTo(8, 0);
      ctx.quadraticCurveTo(5, l1 * 0.6, 1.6, l1 - 1.5);
      ctx.stroke();
      block(v, -3.5, l1 - 2.5, 7, 4, 1.5, c.graphite);
      ctx.restore();
      // The badge, hung from the clip by a ring through its slot
      const q = clipAt(a1);
      ctx.save();
      ctx.translate(q.x, q.y);
      ctx.rotate(-a2);
      card(v, -cw / 2, hy, cw, ch, { r: 4, lift: 0.9 });
      ctx.save();
      rr(ctx, -cw / 2 + 1, hy + 1, cw - 2, 10, 3.5);
      ctx.clip();
      ctx.fillStyle = c.red;
      ctx.fillRect(-cw / 2, hy, cw, 10);
      ctx.restore();
      block(v, -4, hy + 3.5, 8, 2.4, 1.2, c.well);
      ctx.strokeStyle = c.graphite;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, hy + 1.5, 2.6, 0, TAU);
      ctx.stroke();
      dot(v, 0, hy + 19, 5.5, c.tint);
      bar(v, -9, hy + 27.5, 18, { h: 2.6, color: c.head });
      bar(v, -6, hy + 31.5, 12, { h: 2 });
      ctx.restore();
      // The hand: takes the lower corner, tugs, lets go and leaves
      const corner = (b1: number, b2: number) => onBadge(b1, b2, cw / 2 - 4, hy + ch - 5);
      const hand = t < rel ? corner(a1, a2) : corner(LANYARD.a1, LANYARD.a2);
      const drift = 5 * easeOut(seg(t, rel, 0.38));
      pointer(v, hand.x + drift, hand.y + drift * 0.4, { press: t >= grab && t < rel ? 1 : 0, alpha: seg(t, 0.03, 0.09) * (1 - seg(t, 0.3, 0.38)) });
    },
  },

  /** 17 · Many things: press Publish and confetti bursts out, each piece on its own throw, spin and
   *  fall under drag and gravity. Rest catches the burst in the air. */
  many: {
    period: 3.2,
    draw(v, t) {
      const { ctx, c } = v;
      const T = 3.2, bx = VW / 2, by = VH - 14, bw = 56, bh = 16, burst = 0.8;
      const tau = (((t - burst) % 1) + 1) % 1 * T; // seconds since the last burst
      const press = pulse(t, 0.72, burst);
      const colors = [c.red, c.tintDeep, c.graphite, mix(c.red, c.raised, 0.45), c.red, c.tint];
      const k = 3, g = 70;
      const e = 1 - Math.exp(-k * tau);
      const fade = 1 - clamp01((tau - 1.2) / 0.6);
      if (fade > 0) {
        for (let i = 0; i < 28; i++) {
          const a = -Math.PI / 2 + ((i + 0.5) / 28 - 0.5) * 2.4 + (hash(i, 1) - 0.5) * 0.18;
          const sp = 50 + hash(i, 2) * 110;
          const vx = Math.cos(a) * sp, vy = Math.sin(a) * sp;
          const x = bx + (vx / k) * e;
          const y = by - 6 + (g / k) * tau + ((vy - g / k) / k) * e; // v' = g − k·v, closed form
          ctx.save();
          ctx.globalAlpha *= fade;
          ctx.translate(x, y);
          ctx.rotate(hash(i, 3) * TAU + tau * (hash(i, 4) * 10 - 5));
          ctx.fillStyle = colors[i % colors.length];
          if (i % 3 === 0) {
            ctx.beginPath();
            ctx.arc(0, 0, 1.5, 0, TAU);
            ctx.fill();
          } else {
            ctx.scale(1, Math.cos(tau * 9 + i)); // a flat piece, flipping as it spins
            ctx.fillRect(-1.2, -2.8, 2.4, 5.6);
          }
          ctx.restore();
        }
      }
      // The button: "Publish", then a tick while it's published
      const published = t < 0.4 ? 1 - seg(t, 0.34, 0.4) : seg(t, burst, burst + 0.04);
      about(ctx, bx, by, 1 - press * 0.06, 1 - press * 0.06, () => {
        ctx.save();
        shade(ctx, c, 4 - press * 2.5, 1.5 - press);
        block(v, bx - bw / 2, by - bh / 2, bw, bh, bh / 2, c.red);
        ctx.restore();
        bar(v, bx - 13, by - 1.5, 26, { color: "rgba(255,255,255,0.9)", alpha: 1 - published });
        ctx.save();
        ctx.globalAlpha *= published;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.7;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(bx - 4, by);
        ctx.lineTo(bx - 1, by + 3);
        ctx.lineTo(bx + 4.5, by - 3);
        ctx.stroke();
        ctx.restore();
      });
      const alpha = seg(t, 0.56, 0.62) * (1 - seg(t, 0.86, 0.96));
      const reach = easeInOut(seg(t, 0.56, 0.7));
      pointer(v, lerp(bx + 40, bx + 8, reach) + seg(t, 0.84, 0.96) * 10, lerp(by + 14, by - 1, reach), { press, alpha });
    },
  },

  /** 18 · Organic motion: a collaborator's cursor drifts over the document on smooth noise, the way a
   *  hand wanders. Random would jitter; this never does. */
  organic: {
    period: 6,
    draw(v, t) {
      const { ctx, c } = v;
      heading(v, 14, 8, 56);
      [140, 126, 146, 110, 134, 90].forEach((w, i) => bar(v, 14, 18 + i * 7, w));
      // Smooth randomness: slow sines at unrelated whole-number rates, so the loop still closes
      const at = (u: number) => ({
        x: 88 + Math.sin(u * TAU + 0.4) * 42 + Math.sin(u * TAU * 3 + 1.9) * 10,
        y: 34 + Math.sin(u * TAU * 2 + 2.3) * 12 + Math.cos(u * TAU * 5 + 0.7) * 3,
      });
      ctx.save();
      ctx.setLineDash([1.5, 2.5]);
      ctx.strokeStyle = c.blue;
      ctx.globalAlpha *= 0.6;
      ctx.beginPath();
      for (let k = 0; k <= 30; k++) {
        const q = at(t - (30 - k) * 0.004);
        k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
      }
      ctx.stroke();
      ctx.restore();
      const q = at(t);
      ctx.save();
      ctx.translate(q.x, q.y);
      shade(ctx, c, 1.5, 0.5);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 10);
      ctx.lineTo(3, 7.5);
      ctx.lineTo(7.5, 7.5);
      ctx.closePath();
      ctx.fillStyle = c.red;
      ctx.fill();
      rr(ctx, 6, 9, 26, 9, 4.5);
      ctx.fill();
      ctx.restore();
      bar(v, q.x + 10.5, q.y + 12, 16, { h: 2.4, color: "rgba(255,255,255,0.9)" });
    },
  },

  /** 19 · Choosing the medium: a segmented control switches one card between CSS (a box), SVG (paths
   *  and handles) and canvas (pixels). Same card; different materials. */
  medium: {
    period: 4.2,
    draw(v, t) {
      const { ctx, c } = v;
      const pos =
        t < 0.3 ? 0
        : t < 0.36 ? easeInOut(seg(t, 0.3, 0.36))
        : t < 0.63 ? 1
        : t < 0.69 ? 1 + easeInOut(seg(t, 0.63, 0.69))
        : t < 0.94 ? 2
        : 2 - 2 * easeInOut(seg(t, 0.94, 1));
      const sw = 26, sx = VW / 2 - (3 * sw) / 2, sy = 5;
      block(v, sx, sy, 3 * sw, 13, 6.5, c.fill);
      card(v, sx + 1 + pos * sw, sy + 1, sw - 2, 11, { r: 5.5, lift: 0.4 });
      // Glyphs: a box (CSS), a curve (SVG), a pixel grid (canvas)
      ctx.save();
      ctx.strokeStyle = c.head;
      ctx.lineWidth = 1;
      rr(ctx, sx + sw / 2 - 3, sy + 4, 6, 5, 1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx + sw * 1.5 - 4, sy + 9);
      ctx.bezierCurveTo(sx + sw * 1.5 - 2, sy + 2, sx + sw * 1.5 + 2, sy + 11, sx + sw * 1.5 + 4, sy + 4);
      ctx.stroke();
      ctx.fillStyle = c.head;
      for (let i = 0; i < 4; i++) ctx.fillRect(sx + sw * 2.5 - 3 + (i % 2) * 3.5, sy + 3.5 + Math.floor(i / 2) * 3.5, 2.5, 2.5);
      ctx.restore();
      // The same card, rendered by whichever medium is chosen, cross-fading as it switches
      const cw = 64, ch = 32, cx = VW / 2 - cw / 2, cy = 25;
      const weight = (m: number) => clamp01(1 - Math.abs(pos - m));
      const css = weight(0), svg = weight(1), pix = weight(2);
      if (css > 0) {
        ctx.save();
        ctx.globalAlpha *= css;
        card(v, cx, cy, cw, ch, { r: 6, lift: 0.8 });
        dot(v, cx + 12, cy + ch / 2, 5, c.red);
        heading(v, cx + 22, cy + 10, 30);
        bar(v, cx + 22, cy + 18, 24);
        ctx.restore();
      }
      if (svg > 0) {
        ctx.save();
        ctx.globalAlpha *= svg;
        ctx.strokeStyle = c.head;
        rr(ctx, cx + 0.5, cy + 0.5, cw - 1, ch - 1, 6);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + 12, cy + ch / 2, 5, 0, TAU);
        ctx.strokeStyle = c.red;
        ctx.stroke();
        line(v, cx + 22, cy + 12, cx + 52, cy + 12, c.head);
        line(v, cx + 22, cy + 19.5, cx + 46, cy + 19.5, c.head);
        for (const [px, py] of [[cx, cy], [cx + cw, cy], [cx, cy + ch], [cx + cw, cy + ch]]) {
          ctx.fillStyle = c.raised;
          ctx.fillRect(px - 2, py - 2, 4, 4);
          ctx.strokeStyle = c.blue;
          ctx.strokeRect(px - 1.5, py - 1.5, 3, 3);
        }
        ctx.restore();
      }
      if (pix > 0) {
        ctx.save();
        ctx.globalAlpha *= pix;
        const p = 4;
        for (let gx = 0; gx < cw; gx += p) {
          for (let gy = 0; gy < ch; gy += p) {
            const round = Math.hypot(gx + p / 2 - 12, gy + p / 2 - ch / 2) < 6;
            const words = gy >= 8 && gy < 14 && gx >= 20 && gx < 52;
            ctx.fillStyle = round ? c.red : words ? c.head : c.fill;
            ctx.fillRect(cx + gx + 0.5, cy + gy + 0.5, p - 1, p - 1);
          }
        }
        ctx.restore();
      }
    },
  },

  /** 20 · Performance: a card moved by layout stutters (its frames blow the budget and get dropped);
   *  moved by transform it glides (every frame well under). The frame chart says which is which. */
  performance: {
    period: 3.6,
    draw(v, t) {
      const { ctx, c } = v;
      const N = perfFrames.length, x0 = 14, x1 = 162, base = 54, budget = 10, xa = 16, xb = 118;
      const now = Math.floor(t * N);
      let x: number;
      if (t < 0.5) {
        // Only frames that made the budget reach the screen; the card holds through the rest.
        let shown = 0;
        for (let f = 0; f <= now; f++) if (perfFrames[f] <= budget) shown = f;
        x = lerp(xa, xb, easeInOut(shown / (N / 2 - 1)));
      } else {
        x = lerp(xb, xa, easeInOut(seg(t, 0.52, 0.96)));
      }
      card(v, x, 8, 42, 20, { r: 5, lift: 0.7 });
      dot(v, x + 9, 18, 4, c.red);
      heading(v, x + 17, 13.5, 18);
      bar(v, x + 17, 20, 14);
      // The frame chart: a bar per frame, the budget dashed across it, the current frame marked
      const pitch = (x1 - x0) / N;
      perfFrames.forEach((fh, i) => {
        const over = fh > budget;
        block(v, x0 + i * pitch + 0.5, base - fh, pitch - 1.4, fh, 1, over ? c.red : c.graphite, i === now ? 1 : 0.7);
      });
      const px = x0 + (now + 0.5) * pitch - 0.7;
      ctx.beginPath();
      ctx.moveTo(px, base + 2);
      ctx.lineTo(px - 2.2, base + 5.5);
      ctx.lineTo(px + 2.2, base + 5.5);
      ctx.closePath();
      ctx.fillStyle = c.ink;
      ctx.fill();
      line(v, x0 - 2, base - budget, x1 + 2, base - budget, c.graphite, { dash: [2, 2], alpha: 0.9 });
      line(v, x0 - 2, base + 0.5, x1 + 2, base + 0.5, c.graphite, { alpha: 0.5 });
    },
  },

  /** 21 · Care: the same card, entering with full motion and then with "Reduce motion" on: a short
   *  fade and a small rise. Reduced, never removed. */
  care: {
    period: 3.8,
    draw(v, t) {
      const { ctx, c } = v;
      const T = 3.8, W = 72, H = 26, x = 22, rest = 30;
      const reduce = t < 0.3 ? 1 - easeInOut(seg(t, 0.1, 0.16)) : easeInOut(seg(t, 0.58, 0.64));
      // The setting
      bar(v, 102, 11.5, 30, { color: c.head });
      toggle(v, 140, 13, reduce);
      line(v, 12, 24.5, VW - 12, 24.5, c.fill);
      // The card, full motion: from below the edge on a spring, trailing its frames
      const big = (tt: number) => springs.bold((tt - 0.2) * T);
      const shape = (y: number, s: number) => ({ y, s });
      let now = shape(rest, 1), alpha = 1;
      if (t < 0.2) alpha = 1 - easeIn(seg(t, 0.04, 0.09));
      else if (t < 0.56) {
        const p = big(t);
        now = shape(rest + 34 * (1 - p), lerp(0.86, 1, p));
        alpha = clamp01(p * 3) * (1 - easeIn(seg(t, 0.5, 0.55)));
        for (let kk = 4; kk >= 1; kk--) {
          const q = big(t - kk * 0.018);
          if (t < 0.5 && q > 0.02 && Math.abs(q - p) > 0.02) pencilRect(v, x, rest + 34 * (1 - q), W, H, 6, 0.12 * (5 - kk));
        }
      } else if (t < 0.68) alpha = 0;
      else {
        const p = easeOut(seg(t, 0.68, 0.82));
        now = shape(rest + 4 * (1 - p), 1);
        alpha = p;
      }
      if (alpha > 0) {
        ctx.save();
        ctx.globalAlpha *= alpha;
        about(ctx, x + W / 2, now.y + H / 2, now.s, now.s, () => {
          card(v, x, now.y, W, H, { r: 6, lift: 0.8 });
          block(v, x + 5, now.y + 5, 16, 16, 3, c.tint);
          heading(v, x + 27, now.y + 7, 30);
          bar(v, x + 27, now.y + 15, 36);
        });
        ctx.restore();
      }
      pointer(v, 153, 15, { press: Math.max(pulse(t, 0.09, 0.13), pulse(t, 0.57, 0.61)) });
    },
  },

  /** 22 · Taste: a to-do list, ticked. Something done this often gets the smallest feedback that
   *  reads: a clean tick, a line through, nothing that bounces. */
  taste: {
    period: 3.6,
    draw(v, t) {
      const { ctx, c } = v;
      const rows = [16, 32, 48], bx = 26, S = 11, lx = 46, widths = [72, 90, 58];
      const cleared = 1 - seg(t, 0.42, 0.47);
      const pressAt = [0.61, 0.77, 0.05];
      const state = (i: number) => {
        const a = pressAt[i];
        const on = i === 2 ? (t < 0.5 ? seg(t, a + 0.01, a + 0.06) * cleared : 0) : t < 0.5 ? cleared : seg(t, a + 0.01, a + 0.06);
        const strike = i === 2 ? (t < 0.5 ? easeInOut(seg(t, a + 0.04, a + 0.14)) * cleared : 0) : t < 0.5 ? cleared : easeInOut(seg(t, a + 0.04, a + 0.14));
        return { on: easeOut(on), strike, press: pulse(t, a - 0.02, a + 0.02) };
      };
      rows.forEach((y, i) => {
        const s = state(i);
        const k = 1 - s.press * 0.12;
        about(ctx, bx + S / 2, y, k, k, () => {
          card(v, bx, y - S / 2, S, S, { r: 3, lift: 0.3 });
          if (s.on > 0) {
            block(v, bx, y - S / 2, S, S, 3, c.red, s.on);
            // The tick, drawn as one quick stroke
            const a = { x: bx + 3, y: y + 0.2 }, m = { x: bx + 4.9, y: y + 2.2 }, e = { x: bx + 8.2, y: y - 2.2 };
            const l1 = Math.hypot(m.x - a.x, m.y - a.y), l2 = Math.hypot(e.x - m.x, e.y - m.y), d = s.on * (l1 + l2);
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 1.5;
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            if (d <= l1) ctx.lineTo(lerp(a.x, m.x, d / l1), lerp(a.y, m.y, d / l1));
            else {
              ctx.lineTo(m.x, m.y);
              ctx.lineTo(lerp(m.x, e.x, (d - l1) / l2), lerp(m.y, e.y, (d - l1) / l2));
            }
            ctx.stroke();
          }
        });
        bar(v, lx, y - 1.5, widths[i], { color: c.head, alpha: 1 - 0.55 * s.strike });
        if (s.strike > 0) line(v, lx - 1, y, lx - 1 + (widths[i] + 2) * s.strike, y, c.head, { width: 1 });
      });
      // The pointer: on the last row at rest; back to the top once the list is cleared
      const box = (i: number) => ({ x: bx + 6, y: rows[i] + 1 });
      const legs: [number, number, number, number][] = [
        [0.5, 0.58, 2, 0],
        [0.68, 0.74, 0, 1],
        [0.86, 0.96, 1, 2],
      ];
      let p = box(2);
      for (const [a, b, from, to] of legs) {
        if (t >= a) {
          const u = easeInOut(seg(t, a, b));
          p = { x: lerp(box(from).x, box(to).x, u), y: lerp(box(from).y, box(to).y, u) };
        }
      }
      pointer(v, p.x, p.y, { press: Math.max(...pressAt.map((a) => pulse(t, a - 0.02, a + 0.02))) });
    },
  },

  /** 23 · Animated infographics: a chart changes in stages: values first, then order. Each bar keeps
   *  who it is (object constancy), and the red one is easy to follow wherever it lands. */
  infographics: {
    period: 3.6,
    draw(v, t) {
      const { ctx, c } = v;
      const A = [0.92, 0.7, 0.52, 0.38, 0.2];
      const B = [0.46, 0.8, 0.3, 0.96, 0.62];
      const tracked = 3;
      const order = (vals: number[]) => vals.map((_, i) => i).sort((a, b) => vals[b] - vals[a]);
      const oA = order(A), oB = order(B);
      const first = t < 0.58;
      const vk = first ? easeInOut(seg(t, 0.1, 0.28)) : easeInOut(seg(t, 0.62, 0.76));
      const sk = first ? easeInOut(seg(t, 0.32, 0.52)) : easeInOut(seg(t, 0.78, 0.94));
      const val = (i: number) => (first ? lerp(A[i], B[i], vk) : lerp(B[i], A[i], vk));
      const slot = (i: number) => (first ? lerp(oA.indexOf(i), oB.indexOf(i), sk) : lerp(oB.indexOf(i), oA.indexOf(i), sk));
      const base = 57, top = 21, bw = 16, gap = 12, x0 = (VW - (5 * bw + 4 * gap)) / 2;
      heading(v, 14, 8, 40);
      dot(v, 142, 10, 2.5, c.red);
      bar(v, 148, 8.5, 16);
      for (let k = 1; k <= 3; k++) line(v, x0 - 6, base - (k * (base - top)) / 3, VW - x0 + 6, base - (k * (base - top)) / 3, c.fill);
      line(v, x0 - 6, base + 0.5, VW - x0 + 6, base + 0.5, c.graphite, { alpha: 0.6 });
      // While the order changes, the tracked bar's path, in pencil
      const path = pulse(sk, 0, 1);
      if (path > 0.02) {
        const s0 = first ? oA.indexOf(tracked) : oB.indexOf(tracked), s1 = first ? oB.indexOf(tracked) : oA.indexOf(tracked);
        const xa = x0 + s0 * (bw + gap) + bw / 2, xb = x0 + s1 * (bw + gap) + bw / 2;
        const yy = base - val(tracked) * (base - top) - 4;
        ctx.save();
        ctx.globalAlpha *= 0.8 * path;
        ctx.setLineDash([2, 2.5]);
        ctx.strokeStyle = c.blue;
        ctx.beginPath();
        ctx.moveTo(xa, yy);
        ctx.quadraticCurveTo((xa + xb) / 2, yy - 10, xb, yy);
        ctx.stroke();
        ctx.restore();
      }
      for (let i = 0; i < 5; i++) {
        const x = x0 + slot(i) * (bw + gap);
        const hh = val(i) * (base - top);
        block(v, x, base - hh, bw, hh, 2.5, i === tracked ? c.red : c.tintDeep);
      }
    },
  },

  /** 24 · Motion architecture: one token drives every component. Change the token (an ease becomes a
   *  spring) and the switch, the tabs and the chip all change how they move, together. */
  architecture: {
    period: 3.6,
    draw(v, t) {
      const { ctx, c } = v;
      const T = 3.6;
      // Which curve the token holds: 0 an ease, 1 a spring
      const m = t < 0.6 ? easeInOut(seg(t, 0.38, 0.46)) : 1 - easeInOut(seg(t, 0.86, 0.94));
      const q = t < 0.48 ? easeOut(seg(t, 0.06, 0.34)) : 1 - springs.token((t - 0.52) * T);
      // The token: a chip holding its curve
      const tk = { x: 10, y: 16, w: 42, h: 32 };
      const bump = 1 + 0.06 * pulse(t, 0.38, 0.46);
      about(ctx, tk.x + tk.w / 2, tk.y + tk.h / 2, bump, bump, () => {
        card(v, tk.x, tk.y, tk.w, tk.h, { r: 6, lift: 0.9 });
        const gx0 = tk.x + 7, gx1 = tk.x + tk.w - 7, g0 = tk.y + tk.h - 7, g1 = tk.y + 11;
        line(v, gx0, g1, gx1, g1, c.fill);
        line(v, gx0, g0, gx1, g0, c.fill);
        ctx.save();
        ctx.strokeStyle = c.red;
        ctx.lineWidth = 1.5;
        ctx.lineJoin = "round";
        ctx.beginPath();
        for (let k = 0; k <= 28; k++) {
          const u = k / 28;
          const yv = lerp(easeOut(u), springs.token(u * springs.token.T * 0.7), m);
          const px = lerp(gx0, gx1, u), py = lerp(g0, g1, yv);
          k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.stroke();
        ctx.restore();
      });
      // Its wiring, in pencil; a change travels down it
      const rows = [15, 32, 49];
      const travel = seg(t, 0.44, 0.52);
      rows.forEach((ry) => {
        const p0 = { x: tk.x + tk.w + 1, y: 32 }, p1 = { x: 66, y: ry };
        ctx.save();
        ctx.strokeStyle = c.blue;
        ctx.globalAlpha *= 0.5;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.bezierCurveTo(p0.x + 8, p0.y, p1.x - 8, p1.y, p1.x, p1.y);
        ctx.stroke();
        ctx.restore();
        if (travel > 0 && travel < 1) {
          const u = travel, iu = 1 - u;
          const bxp = iu ** 3 * p0.x + 3 * iu * iu * u * (p0.x + 8) + 3 * iu * u * u * (p1.x - 8) + u ** 3 * p1.x;
          const byp = iu ** 3 * p0.y + 3 * iu * iu * u * p0.y + 3 * iu * u * u * p1.y + u ** 3 * p1.y;
          dot(v, bxp, byp, 1.8, c.blue);
        }
      });
      // The components, all on the one curve
      toggle(v, 72, rows[0], q, { w: 22, h: 12, color: c.graphite });
      bar(v, 102, rows[0] - 1.5, 44);
      [0, 1, 2].forEach((i) => bar(v, 74 + i * 30, rows[1] - 3, 20, { color: c.head, alpha: 0.75 }));
      bar(v, lerp(74, 134, q), rows[1] + 3.5, 20, { h: 2, color: c.ink });
      line(v, 72, rows[2] + 0.5, 158, rows[2] + 0.5, c.fill, { width: 2 });
      card(v, lerp(72, 132, q), rows[2] - 5, 26, 10, { r: 5, lift: 0.5 });
    },
  },

  /** 25 · Your motion system: one screen builds itself in the order it was designed: the bar slides
   *  down, the picture opens, the words rise one after another, the button lands last. */
  capstone: {
    period: 3.6,
    draw(v, t) {
      const { ctx, c } = v;
      const T = 3.6;
      const gone = t < 0.18 ? easeIn(seg(t, 0.05, 0.11)) : 0;
      const at = (a: number, d = 0.14) => (t < 0.18 ? 1 : easeOut(seg(t, a, a + d)));
      ctx.save();
      ctx.globalAlpha *= 1 - gone;
      // The bar, down from the top edge
      const hb = at(0.2);
      ctx.save();
      ctx.translate(0, -14 * (1 - hb));
      ctx.fillStyle = c.raised;
      ctx.fillRect(0, 0, VW, 13);
      line(v, 0, 13.5, VW, 13.5, c.edge);
      dot(v, 12, 6.5, 3, c.red);
      [0, 1, 2].forEach((i) => bar(v, 112 + i * 18, 5, 12));
      ctx.restore();
      // The picture opens upward from its baseline
      const im = at(0.3, 0.18);
      if (im > 0) {
        ctx.save();
        rr(ctx, 10, 20 + 36 * (1 - im), 60, 36 * im + 2, 4);
        ctx.clip();
        about(ctx, 40, 56, lerp(1.06, 1, im), lerp(1.06, 1, im), () => photo(v, 10, 20, 60, 36, { lift: 0.3 }));
        ctx.restore();
      }
      // The words, one after another
      [0, 1, 2].forEach((i) => {
        const p = at(0.4 + i * 0.05);
        const yy = [22, 31, 37][i] + (1 - p) * 5;
        if (i === 0) bar(v, 80, yy, 58, { h: 5, color: c.head, alpha: p });
        else bar(v, 80, yy, [0, 72, 56][i], { alpha: p });
      });
      // The button, last, on a spring
      const btn = t < 0.18 ? 1 : springs.button((t - 0.56) * T);
      if (btn > 0.01) about(ctx, 97, 50, btn, btn, () => bar(v, 80, 46, 34, { h: 9, color: c.red }));
      ctx.restore();
    },
  },
};

/* ---------------------------------------------------------------- scene data */

/** 12 · Past its limit the card follows less and less (iOS's rubber-band curve). */
const directLimit = 70;
const directRelease = 0.52;
function band(d: number, limit = directLimit, dim = 60) {
  return d <= limit ? d : limit + (1 - 1 / (((d - limit) * 0.55) / dim + 1)) * dim;
}
/** The spring that takes the card home, set off from where and how fast it was let go. */
let directSpringCache: ReturnType<typeof spring> | null = null;
function directSpring() {
  if (directSpringCache) return directSpringCache;
  const reach = (tt: number) => (directLimit + 44) * easeIn(seg(tt, 0.14, directRelease));
  const eps = 0.002;
  const from = band(reach(directRelease));
  const velocity = (from - band(reach(directRelease - eps))) / (eps * 3.4);
  return (directSpringCache = spring(fromResponse(0.45, 0.25), { from, to: 0, velocity }));
}

/** 16 · The lanyard: strap (l1, pivot to clip) and badge (l2, clip to its middle) as a damped double
 *  pendulum. Each small step updates the velocities first, then the angles with the new velocities:
 *  semi-implicit Euler, the integrator the chapter settles on. */
const LANYARD = { l1: 22, l2: 20, a1: 0.42, a2: 0.75 };
const lanyard = (() => {
  const { l1, l2, a1, a2 } = LANYARD;
  const m1 = 0.4, m2 = 1, g = 1500, c1 = 5, c2 = 3, dt = 1 / 480, n = Math.ceil(3 / dt);
  const th1 = new Float32Array(n + 1), th2 = new Float32Array(n + 1);
  let t1 = a1, t2 = a2, w1 = 0, w2 = 0;
  for (let i = 0; i <= n; i++) {
    th1[i] = t1;
    th2[i] = t2;
    const d = t1 - t2, den = 2 * m1 + m2 - m2 * Math.cos(2 * d);
    const al1 = (-g * (2 * m1 + m2) * Math.sin(t1) - m2 * g * Math.sin(t1 - 2 * t2) - 2 * Math.sin(d) * m2 * (w2 * w2 * l2 + w1 * w1 * l1 * Math.cos(d))) / (l1 * den) - c1 * w1;
    const al2 = (2 * Math.sin(d) * (w1 * w1 * l1 * (m1 + m2) + g * (m1 + m2) * Math.cos(t1) + w2 * w2 * l2 * m2 * Math.cos(d))) / (l2 * den) - c2 * (w2 - w1);
    w1 += al1 * dt;
    w2 += al2 * dt;
    t1 += w1 * dt;
    t2 += w2 * dt;
  }
  return (sec: number): [number, number] => {
    const i = Math.min(n, Math.max(0, Math.floor(sec / dt)));
    return [th1[i], th2[i]];
  };
})();

/** 20 · Frame times: the first half moved by layout (heavy, some over budget), the second by transform. */
const perfFrames = Array.from({ length: 36 }, (_, i) => (i < 18 ? (i === 17 ? 7 : 4 + 13 * hash(i, 5)) : 2.5 + 3 * hash(i, 6)));
