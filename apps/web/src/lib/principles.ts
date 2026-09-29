/**
 * The twelve principles of The Illusion of Life, each as a tiny UI clip.
 * draw(ctx, t, w, h, c): t runs 0 → 1 over one loop. Used by the ch. 07 figure and the
 * "Spot the Principle" drill.
 */

import { cubicBezier, easeIn, easeOut, easeInOut, spring, fromResponse, perlin1D } from "@inbetween/core";
import type { Pencils } from "./specimens";

export interface Principle {
  id: string;
  name: string;
  ui: string;
  /** One sentence shown after the drill answer. */
  why: string;
  draw(ctx: CanvasRenderingContext2D, t: number, w: number, h: number, c: Pencils): void;
}

const TAU = Math.PI * 2;
const out = cubicBezier(0.2, 0.8, 0.2, 1);
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function rrect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function card(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: Pencils, fill?: string) {
  rrect(ctx, x, y, w, h, 6);
  ctx.fillStyle = fill ?? c.paper;
  ctx.fill();
  ctx.strokeStyle = c.graphite;
  ctx.lineWidth = 1;
  ctx.stroke();
}
function lines(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, c: Pencils, n = 2) {
  ctx.fillStyle = c.rule;
  for (let i = 0; i < n; i++) ctx.fillRect(x, y + i * 9, w * (i ? 0.6 : 0.85), 4);
}
function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
}
function ring(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, stroke: string) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
}

const soft = spring(fromResponse(0.35, 0.35));
const softEnd = soft.settleTime();
const noise = perlin1D(5);

export const PRINCIPLES: Principle[] = [
  {
    id: "squash",
    name: "Squash & stretch",
    ui: "Press states, elastic overscroll",
    why: "The button flattens under the press and springs back: it has a material, and it felt your finger.",
    draw(ctx, t, w, h, c) {
      // Press: flatten. Release: spring back, overshooting into a small stretch.
      const k = t < 0.25 ? easeOut(seg(t, 0, 0.25)) : 1 - soft.position(seg(t, 0.25, 0.75) * softEnd);
      const sy = 1 - 0.22 * k;
      const sx = 1 + 0.12 * k;
      const bw = 96, bh = 34;
      ctx.save();
      ctx.translate(w / 2, h / 2 + bh / 2);
      ctx.scale(sx, sy);
      rrect(ctx, -bw / 2, -bh, bw, bh, bh / 2);
      ctx.fillStyle = c.red;
      ctx.fill();
      ctx.restore();
    },
  },
  {
    id: "anticipation",
    name: "Anticipation",
    ui: "A wind-up before a big move",
    why: "The card pulls back a little before it launches, so your eye is ready for the move.",
    draw(ctx, t, w, h, c) {
      const back = -14 * easeOut(seg(t, 0.05, 0.3)) * (1 - seg(t, 0.3, 0.38));
      const go = (w - 120) * easeIn(seg(t, 0.32, 0.62));
      const x = 30 + back + go;
      card(ctx, x, h / 2 - 22, 60, 44, c, c.red);
    },
  },
  {
    id: "staging",
    name: "Staging",
    ui: "One thing moves at a time",
    why: "Everything else holds still and dims while one tile comes forward: the eye knows exactly where to look.",
    draw(ctx, t, w, h, c) {
      const k = out(seg(t, 0.1, 0.45)) * (1 - easeIn(seg(t, 0.75, 0.95)));
      const cols = 3;
      const tw = (w - 60) / cols;
      for (let i = 0; i < 6; i++) {
        const x = 20 + (i % cols) * (tw + 10);
        const y = 20 + Math.floor(i / cols) * ((h - 50) / 2 + 10);
        const hero = i === 4;
        ctx.globalAlpha = hero ? 1 : 1 - 0.6 * k;
        const s = hero ? 1 + 0.12 * k : 1;
        ctx.save();
        ctx.translate(x + tw / 2, y + (h - 50) / 4);
        ctx.scale(s, s);
        card(ctx, -tw / 2, -(h - 50) / 4, tw, (h - 50) / 2, c, hero ? c.red : undefined);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    },
  },
  {
    id: "straight-pose",
    name: "Straight-ahead & pose-to-pose",
    ui: "Procedural vs keyframed",
    why: "Left, the dot is simulated frame by frame and wanders. Right, it moves between planned key poses (circled).",
    draw(ctx, t, w, h, c) {
      const half = w / 2;
      // straight ahead: noise, drawn frame after frame
      const sx = 20 + (half - 40) * t;
      const sy = h / 2 + noise(t * 6) * 26;
      dot(ctx, sx, sy, 7, c.red);
      // pose to pose: three keys with eased inbetweens
      const keys = [[half + 20, h - 30], [half + (half - 20) / 2, 26], [w - 20, h - 30]];
      keys.forEach(([x, y]) => ring(ctx, x, y, 9, c.red));
      const u = t < 0.5 ? easeInOut(t / 0.5) : easeInOut((t - 0.5) / 0.5);
      const [a, b] = t < 0.5 ? [keys[0], keys[1]] : [keys[1], keys[2]];
      dot(ctx, lerp(a[0], b[0], u), lerp(a[1], b[1], u), 7, c.red);
      ctx.strokeStyle = c.rule;
      ctx.beginPath();
      ctx.moveTo(half, 10);
      ctx.lineTo(half, h - 10);
      ctx.stroke();
    },
  },
  {
    id: "follow-through",
    name: "Follow-through & overlap",
    ui: "Children settle after parents",
    why: "The panel stops first; its rows arrive a beat later and settle. Nothing stops all at once.",
    draw(ctx, t, w, h, c) {
      const px = lerp(w, 20, out(seg(t, 0.05, 0.4)));
      card(ctx, px, 14, w - 40, h - 28, c);
      for (let i = 0; i < 3; i++) {
        const lag = 0.08 + i * 0.07;
        const u = seg(t, 0.05 + lag, 0.55 + lag);
        const sp = spring(fromResponse(0.4, 0.3)).position(u * 0.9);
        const rx = lerp(w + 40, px + 16, clamp(sp, 0, 1.2));
        ctx.fillStyle = i === 0 ? c.red : c.graphite;
        ctx.fillRect(rx, 32 + i * 22, (w - 90) * (i === 0 ? 0.8 : 0.6), 8);
      }
    },
  },
  {
    id: "slow-in-out",
    name: "Slow in & slow out",
    ui: "Easing",
    why: "Tight spacing at both ends, wide in the middle: it starts gently, travels, and lands gently.",
    draw(ctx, t, w, h, c) {
      const y = h / 2;
      ctx.strokeStyle = c.rule;
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(w - 20, y);
      ctx.stroke();
      for (let i = 0; i <= 12; i++) {
        const x = 20 + (w - 40) * easeInOut(i / 12);
        ctx.strokeStyle = c.blue;
        ctx.beginPath();
        ctx.moveTo(x, y + 10);
        ctx.lineTo(x, y + 18);
        ctx.stroke();
      }
      dot(ctx, 20 + (w - 40) * easeInOut(seg(t, 0.05, 0.8)), y, 9, c.red);
    },
  },
  {
    id: "arcs",
    name: "Arcs",
    ui: "Curved paths for natural travel",
    why: "Thrown things travel on arcs, not rails. The curved path reads as natural; the straight one as mechanical.",
    draw(ctx, t, w, h, c) {
      const u = easeInOut(seg(t, 0.05, 0.8));
      const x0 = 26, x1 = w - 26, y0 = h - 24;
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = c.blue;
      ctx.beginPath();
      for (let i = 0; i <= 30; i++) {
        const v = i / 30;
        ctx.lineTo(lerp(x0, x1, v), y0 - (h - 50) * 4 * v * (1 - v));
      }
      ctx.stroke();
      ctx.setLineDash([]);
      dot(ctx, lerp(x0, x1, u), y0 - (h - 50) * 4 * u * (1 - u), 9, c.red);
    },
  },
  {
    id: "secondary",
    name: "Secondary action",
    ui: "An icon reacts while a panel moves",
    why: "As the drawer opens, its chevron turns to point the new way. A small second motion supports the main one.",
    draw(ctx, t, w, h, c) {
      const open = out(seg(t, 0.1, 0.5)) * (1 - easeIn(seg(t, 0.75, 0.95)));
      const dw = (w - 40) * 0.55;
      card(ctx, 20, 16, w - 40, h - 32, c);
      lines(ctx, 32, 30, (w - 70) * 0.5, c, 3);
      ctx.save();
      ctx.beginPath();
      ctx.rect(20, 16, w - 40, h - 32);
      ctx.clip();
      card(ctx, w - 20 - dw * open, 16, dw, h - 32, c);
      ctx.restore();
      // chevron
      ctx.save();
      ctx.translate(w - 36 - dw * open + 4, 30);
      ctx.rotate(Math.PI * open);
      ctx.strokeStyle = c.red;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4, -5);
      ctx.lineTo(3, 0);
      ctx.lineTo(-4, 5);
      ctx.stroke();
      ctx.restore();
    },
  },
  {
    id: "timing",
    name: "Timing",
    ui: "Duration as weight and importance",
    why: "Same path, different durations. The quick one feels light and minor; the slow one heavy and important.",
    draw(ctx, t, w, h, c) {
      [0.3, 0.85].forEach((d, i) => {
        const y = h * (i ? 0.68 : 0.32);
        ctx.strokeStyle = c.rule;
        ctx.beginPath();
        ctx.moveTo(20, y);
        ctx.lineTo(w - 20, y);
        ctx.stroke();
        dot(ctx, 20 + (w - 40) * out(seg(t, 0.05, 0.05 + d)), y, 8, c.red);
      });
    },
  },
  {
    id: "exaggeration",
    name: "Exaggeration",
    ui: "Overshoot for delight, used sparingly",
    why: "The badge overshoots its size and settles back. Exaggeration makes a moment feel alive, if it's rare.",
    draw(ctx, t, w, h, c) {
      const sp = spring(fromResponse(0.45, 0.55));
      const s = t < 0.05 ? 0 : sp.position(seg(t, 0.05, 0.9) * 1.6);
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(Math.max(0, s), Math.max(0, s));
      dot(ctx, 0, 0, 22, c.red);
      ctx.restore();
    },
  },
  {
    id: "solid",
    name: "Solid drawing",
    ui: "Depth: scale, shadow, perspective",
    why: "Lifting the card grows it slightly and softens its shadow together. The depth cues agree, so it reads as a solid object.",
    draw(ctx, t, w, h, c) {
      const k = out(seg(t, 0.1, 0.45)) * (1 - easeInOut(seg(t, 0.7, 0.95)));
      const s = 1 + 0.08 * k;
      ctx.save();
      ctx.translate(w / 2, h / 2 - 4 * k);
      ctx.scale(s, s);
      ctx.shadowColor = "rgba(0,0,0,0.35)";
      ctx.shadowBlur = 4 + 18 * k;
      ctx.shadowOffsetY = 2 + 10 * k;
      rrect(ctx, -50, -30, 100, 60, 8);
      ctx.fillStyle = c.paper;
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.strokeStyle = c.red;
      ctx.stroke();
      ctx.restore();
    },
  },
  {
    id: "appeal",
    name: "Appeal",
    ui: "Personality, consistency, restraint",
    why: "One small, consistent gesture: the knob stretches a little as it travels and settles softly. Charm through restraint.",
    draw(ctx, t, w, h, c) {
      const sp = spring(fromResponse(0.35, 0.2));
      const on = t < 0.5 ? sp.position(seg(t, 0.05, 0.5) * 0.9) : 1 - sp.position(seg(t, 0.55, 1) * 0.9);
      const tw = 90, th = 40;
      const x0 = w / 2 - tw / 2;
      const y0 = h / 2 - th / 2;
      rrect(ctx, x0, y0, tw, th, th / 2);
      ctx.fillStyle = c.rule;
      ctx.fill();
      const travel = tw - th;
      const speed = Math.abs(on - 0.5) < 0.45 ? 1 : 0;
      const stretch = 6 * speed * Math.sin(Math.PI * clamp(on));
      rrect(ctx, x0 + 4 + travel * clamp(on, -0.05, 1.05) - stretch / 2, y0 + 4, th - 8 + stretch, th - 8, (th - 8) / 2);
      ctx.fillStyle = c.red;
      ctx.fill();
    },
  },
];

export const principleById = (id: string) => PRINCIPLES.find((p) => p.id === id)!;
