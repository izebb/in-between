/**
 * Motion specimens for the index: a one-second loop of each chapter's idea.
 * At rest a specimen is still: its onion skin, drawn as a spacing chart.
 * On hover it plays. Under reduced motion it never plays; the still says it all.
 */

import {
  cubicBezier,
  easeIn,
  easeOut,
  easeInOut,
  spring,
  fromResponse,
  decay,
  perlin1D,
  seededRandom,
  steps,
  keyframes,
} from "@inbetween/core";

export interface Pencils {
  ink: string;
  graphite: string;
  rule: string;
  blue: string;
  red: string;
  paper: string;
}

export interface G {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  c: Pencils;
}

type Specimen = (g: G, t: number | null) => void;

const TAU = Math.PI * 2;
const outCurve = cubicBezier(0.2, 0.8, 0.2, 1);

function dot({ ctx }: G, x: number, y: number, r: number, fill: string) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
}
function ring({ ctx }: G, x: number, y: number, r: number, stroke: string, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}
function line({ ctx }: G, x1: number, y1: number, x2: number, y2: number, stroke: string, width = 1) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  ctx.stroke();
}
function box({ ctx }: G, x: number, y: number, w: number, h: number, stroke: string | null, fill: string | null, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }
  ctx.restore();
}

/** Moving along x with an easing: ghosts at each frame (still) or the dot at t (playing). */
function travel(g: G, ease: (x: number) => number, t: number | null, opts: { y?: number; frames?: number; x0?: number; x1?: number; r?: number; active?: number } = {}) {
  const y = opts.y ?? g.h / 2;
  const x0 = opts.x0 ?? 8;
  const x1 = opts.x1 ?? g.w - 8;
  const frames = opts.frames ?? 12;
  const r = opts.r ?? 3.5;
  const active = opts.active ?? 0.75; // share of the loop spent moving
  line(g, x0, y, x1, y, g.c.rule);
  for (let i = 0; i <= frames; i++) {
    const x = x0 + (x1 - x0) * ease(i / frames);
    line(g, x, y - 3, x, y + 3, g.c.blue);
  }
  if (t === null) {
    ring(g, x0, y, r, g.c.red);
    dot(g, x1, y, r, g.c.red);
    return;
  }
  const p = Math.min(1, t / active);
  dot(g, x0 + (x1 - x0) * ease(p), y, r, g.c.red);
}

export const specimens: Record<string, Specimen> = {
  information(g, t) {
    // Causality: a thing leaves one place and arrives in another.
    const { w, h, c } = g;
    box(g, 6, h / 2 - 8, 26, 16, c.graphite, null);
    box(g, w - 32, h / 2 - 8, 26, 16, c.graphite, null);
    const x0 = 19, x1 = w - 19, y = h / 2;
    if (t === null) {
      for (let i = 1; i < 8; i++) ring(g, x0 + (x1 - x0) * outCurve(i / 8), y, 2.5, c.blue, 0.8);
      dot(g, x1, y, 3, c.red);
      return;
    }
    const p = Math.min(1, t / 0.7);
    dot(g, x0 + (x1 - x0) * outCurve(p), y, 3, c.red);
  },

  timing(g, t) {
    // Same distance, three durations: 100 / 300 / 500ms.
    const rows = [0.2, 0.6, 1];
    rows.forEach((d, i) => {
      const y = 8 + i * ((g.h - 16) / 2);
      const frames = Math.round(d * 12);
      travel(g, easeOut, t === null ? null : Math.min(1, t / d), { y, frames, r: 2.5, active: 1 });
    });
  },

  spacing(g, t) {
    travel(g, outCurve, t, { frames: 12 });
  },

  weight(g, t) {
    // A bounce: fall (ease-in), rise (ease-out), losing height each time.
    const { w, h, c } = g;
    const ground = h - 5;
    line(g, 4, ground + 3.5, w - 4, ground + 3.5, c.graphite);
    const hops = [
      { x0: 8, x1: 50, top: 6 },
      { x0: 50, x1: 84, top: 16 },
      { x0: 84, x1: 108, top: 23 },
      { x0: 108, x1: w - 8, top: 27 },
    ];
    const at = (u: number) => {
      const seg = Math.min(hops.length - 1, Math.floor(u * hops.length));
      const lu = u * hops.length - seg;
      const hp = hops[seg];
      const x = hp.x0 + (hp.x1 - hp.x0) * lu;
      const y = lu < 0.5 ? hp.top + (ground - hp.top) * easeIn(1 - lu * 2) : hp.top + (ground - hp.top) * easeIn((lu - 0.5) * 2);
      return [x, y] as const;
    };
    if (t === null) {
      for (let i = 0; i <= 32; i++) {
        const [x, y] = at(i / 32);
        ring(g, x, y, 2, c.blue, 0.75);
      }
      return;
    }
    const [x, y] = at(Math.min(0.999, t));
    dot(g, x, y, 3.5, c.red);
  },

  springs(g, t) {
    const s = spring(fromResponse(0.45, 0.45), { from: 0, to: 1 });
    const dur = s.settleTime();
    travel(g, (x) => s.position(x * dur), t, { frames: 16, x1: g.w - 22 });
  },

  momentum(g, t) {
    const d = decay({ velocity: 1, lambda: 4 });
    const end = d.target;
    const ease = (x: number) => d.position(x * 1.3) / end;
    travel(g, ease, t, { frames: 14, active: 0.9 });
  },

  twelve(g, t) {
    // Squash and stretch: a ball dropping onto the floor.
    const { w, h, c, ctx } = g;
    const ground = h - 4;
    line(g, 20, ground + 0.5, w - 20, ground + 0.5, c.graphite);
    const cx = w / 2;
    const draw = (u: number, color: string, filled: boolean) => {
      const fall = u < 0.5 ? easeIn(u * 2) : 1 - easeOut((u - 0.5) * 2);
      const r = 5;
      const squash = fall > 0.92 ? 1 + (fall - 0.92) * 6 : 1 - Math.min(0.25, fall * 0.25);
      const sx = squash;
      const sy = 1 / squash;
      const y = 6 + (ground - 6 - r * sy) * fall;
      ctx.save();
      ctx.translate(cx + (u - 0.5) * 40, y + r * sy);
      ctx.scale(sx, sy);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      if (filled) {
        ctx.fillStyle = color;
        ctx.fill();
      } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1 / Math.max(sx, sy);
        ctx.stroke();
      }
      ctx.restore();
    };
    if (t === null) {
      for (let i = 0; i <= 10; i++) draw(i / 10, c.blue, false);
      return;
    }
    draw(t, c.red, true);
  },

  stagger(g, t) {
    const { h, c } = g;
    const n = 6;
    for (let i = 0; i < n; i++) {
      const x = 10 + i * 19;
      const delay = i * 0.08;
      const p = t === null ? 1 : Math.max(0, Math.min(1, (t - delay) / 0.4));
      const bh = (h - 10) * outCurve(p);
      if (t === null) box(g, x, h - 5 - (h - 10), 12, h - 10, c.blue, null, 0.7);
      else box(g, x, h - 5 - bh, 12, bh, null, p < 1 ? c.red : c.ink, 1);
    }
  },

  "enter-exit"(g, t) {
    // Enter generous (ease-out), exit quick (ease-in, 0.7×).
    const { w, h, c } = g;
    const y = h / 2;
    const cw = 22;
    if (t === null) {
      for (let i = 0; i <= 6; i++) box(g, 8 + (w / 2 - cw / 2 - 8) * outCurve(i / 6), y - 7, cw, 14, c.blue, null, 0.6);
      box(g, w / 2 - cw / 2, y - 7, cw, 14, c.red, null);
      return;
    }
    let x: number;
    if (t < 0.45) x = 8 + (w / 2 - cw / 2 - 8) * outCurve(t / 0.45);
    else if (t < 0.62) x = w / 2 - cw / 2;
    else x = w / 2 - cw / 2 + (w - cw - 8 - (w / 2 - cw / 2)) * easeIn(Math.min(1, (t - 0.62) / 0.31));
    box(g, x, y - 7, cw, 14, null, c.red);
  },

  permanence(g, t) {
    // A small square becomes a large panel: the same thing, a new place.
    const { w, h, c } = g;
    const a = { x: 8, y: h / 2 - 5, w: 10, h: 10 };
    const b = { x: w - 60, y: 4, w: 52, h: h - 8 };
    const at = (p: number) => ({
      x: a.x + (b.x - a.x) * p,
      y: a.y + (b.y - a.y) * p,
      w: a.w + (b.w - a.w) * p,
      h: a.h + (b.h - a.h) * p,
    });
    if (t === null) {
      for (let i = 0; i <= 5; i++) {
        const r = at(outCurve(i / 5));
        box(g, r.x, r.y, r.w, r.h, c.blue, null, 0.55);
      }
      return;
    }
    const r = at(easeInOut(Math.min(1, t / 0.75)));
    box(g, r.x, r.y, r.w, r.h, null, c.red);
  },

  spatial(g, t) {
    // Forward: the old card recedes (z), the new one arrives from the right (x).
    const { w, h, c } = g;
    const cw = 34, ch = h - 10;
    const cx = w / 2 - cw / 2;
    const p = t === null ? 1 : outCurve(Math.min(1, t / 0.7));
    const s = 1 - 0.18 * p;
    box(g, w / 2 - (cw * s) / 2, h / 2 - (ch * s) / 2, cw * s, ch * s, c.graphite, null, 1 - 0.5 * p);
    if (t === null) {
      for (let i = 0; i < 5; i++) box(g, cx + (w - cx) * (1 - outCurve(i / 5)), 5, cw, ch, c.blue, null, 0.5);
    }
    box(g, cx + (w - cx) * (1 - p), 5, cw, ch, t === null ? c.red : null, t === null ? null : c.red);
  },

  direct(g, t) {
    // Drag past the edge: rubber band, then spring home.
    const { w, h, c } = g;
    const edge = w - 30;
    line(g, edge, 4, edge, h - 4, c.graphite);
    const y = h / 2;
    const s = spring(fromResponse(0.3, 0.1), { from: 1, to: 0 });
    const pos = (u: number) => {
      if (u < 0.45) return 12 + (edge + 10 - 12) * easeInOut(u / 0.45) * (1 - 0.3 * easeIn(u / 0.45));
      const back = s.position((u - 0.45) * 0.9);
      return edge - 10 + back * 12;
    };
    if (t === null) {
      for (let i = 0; i <= 14; i++) ring(g, pos(i / 14), y, 3, c.blue, 0.7);
      return;
    }
    dot(g, pos(t), y, 3.5, c.red);
  },

  scroll(g, t) {
    // Scroll position drives a progress line: scroll as a scrubber.
    const { w, h, c } = g;
    box(g, w - 12, 3, 6, h - 6, c.rule, null);
    const p = t === null ? 0.6 : 0.5 - 0.5 * Math.cos(t * TAU);
    box(g, w - 12, 3 + (h - 6 - 10) * p, 6, 10, null, t === null ? c.graphite : c.red);
    line(g, 8, h / 2, w - 24, h / 2, c.rule, 2);
    line(g, 8, h / 2, 8 + (w - 32) * p, h / 2, t === null ? c.blue : c.red, 2);
  },

  loop(g, t) {
    // A flipbook: positions around a circle, one per frame.
    const { w, h, c } = g;
    const cx = w / 2, cy = h / 2, r = h / 2 - 5;
    const frames = 12;
    for (let i = 0; i < frames; i++) {
      const a = (i / frames) * TAU - Math.PI / 2;
      ring(g, cx + Math.cos(a) * r * 2.2, cy + Math.sin(a) * r, 2.5, c.blue, 0.6);
    }
    if (t === null) return;
    const i = Math.floor(t * frames);
    const a = (i / frames) * TAU - Math.PI / 2;
    dot(g, cx + Math.cos(a) * r * 2.2, cy + Math.sin(a) * r, 3.5, c.red);
  },

  "easing-hand"(g, t) {
    // x += (target − x) · k: every frame closes a fixed share of the gap.
    const k = 0.25;
    const frames = 14;
    const pos: number[] = [0];
    for (let i = 1; i <= frames; i++) pos.push(pos[i - 1] + (1 - pos[i - 1]) * k);
    const ease = (x: number) => {
      const f = x * frames;
      const i = Math.floor(f);
      if (i >= frames) return pos[frames];
      return pos[i] + (pos[i + 1] - pos[i]) * (f - i);
    };
    travel(g, ease, t, { frames });
  },

  "physics-hand"(g, t) {
    // A mass on a spring, hanging: vertical oscillation with a coil.
    const { w, h, c, ctx } = g;
    const s = spring({ stiffness: 90, damping: 3.5, mass: 1 }, { from: 0, to: 1 });
    const x = w / 2;
    const yAt = (u: number) => 6 + (h - 16) * 0.5 * s.position(u * 2.2);
    line(g, x - 14, 2.5, x + 14, 2.5, c.graphite);
    if (t === null) {
      for (let i = 0; i <= 22; i++) ring(g, x - 30 + i * 3.2, yAt(i / 22) + 5, 2, c.blue, 0.8);
      return;
    }
    const y = yAt(t);
    ctx.beginPath();
    const coils = 7;
    for (let i = 0; i <= coils * 2; i++) {
      const yy = 3 + ((y + 2 - 3) * i) / (coils * 2);
      ctx.lineTo(x + (i % 2 ? 3 : -3), yy);
    }
    ctx.strokeStyle = c.graphite;
    ctx.lineWidth = 1;
    ctx.stroke();
    dot(g, x, y + 5, 4, c.red);
  },

  many(g, t) {
    const { w, h, c } = g;
    const rand = seededRandom(7);
    const n = 26;
    for (let i = 0; i < n; i++) {
      const born = rand();
      const vx = 30 + rand() * 60;
      const vy = -20 + rand() * 40;
      const age = t === null ? 0.6 + rand() * 0.3 : (t - born + 1) % 1;
      const x = 8 + vx * age;
      const y = h / 2 + vy * age + 25 * age * age;
      if (t === null) ring(g, x, y, 1.5, c.blue, 0.7);
      else dot(g, x, y, 1.6, age < 0.15 ? c.red : c.ink);
    }
    if (t === null) dot(g, 8, h / 2, 2.5, c.red);
    void w;
  },

  organic(g, t) {
    const { w, h, c, ctx } = g;
    const n = perlin1D(3);
    const r = seededRandom(3);
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const x = 6 + (i / 60) * (w - 12);
      ctx.lineTo(x, h * 0.3 + (r() - 0.5) * 10);
    }
    ctx.strokeStyle = c.graphite;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const x = 6 + (i / 60) * (w - 12);
      ctx.lineTo(x, h * 0.72 + n(i / 9) * 9);
    }
    ctx.strokeStyle = c.blue;
    ctx.stroke();
    if (t !== null) {
      const i = t * 60;
      dot(g, 6 + (i / 60) * (w - 12), h * 0.72 + n(i / 9) * 9, 3, c.red);
    }
  },

  medium(g, t) {
    // Properties vs pixels: a box (DOM) and a pixel grid (canvas) moving together.
    const { w, h, c } = g;
    const px = 4;
    const p = t === null ? 1 : easeInOut(Math.min(1, t / 0.8));
    const cols = Math.floor((w - 16) / px);
    const pos = Math.round(p * (cols - 5));
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < 3; j++) {
        const lit = i >= pos && i < pos + 4;
        box(g, 8 + i * px, h / 2 + 2 + j * px, px - 1, px - 1, null, lit ? c.red : c.rule);
      }
    }
    const bx = 8 + (w - 16 - 16) * p;
    box(g, bx, 3, 16, 10, t === null ? c.blue : null, t === null ? null : c.ink);
  },

  performance(g, t) {
    // Frame budget: bars under the 8.3ms line are fine; one long frame is a jank.
    const { w, h, c } = g;
    const budget = h * 0.45;
    const n = 16;
    const rand = seededRandom(11);
    const lens = Array.from({ length: n }, (_, i) => (i === 10 ? h - 6 : budget * (0.4 + rand() * 0.5)));
    line(g, 4, h - budget - 2, w - 4, h - budget - 2, c.graphite);
    const shown = t === null ? n : Math.floor(t * n) + 1;
    for (let i = 0; i < shown; i++) {
      const bh = lens[i];
      const x = 6 + i * ((w - 12) / n);
      box(g, x, h - 2 - bh, (w - 12) / n - 2, bh, null, bh > budget ? c.red : t === null ? c.blue : c.ink, bh > budget ? 1 : 0.6);
    }
  },

  care(g, t) {
    // Reduced motion: the ghosts stay, the travel stops; the dot fades between ends.
    const { w, h, c } = g;
    const y = h / 2;
    for (let i = 0; i <= 10; i++) line(g, 8 + (w - 16) * outCurve(i / 10), y - 3, 8 + (w - 16) * outCurve(i / 10), y + 3, c.blue);
    line(g, 8, y, w - 8, y, c.rule);
    if (t === null) {
      dot(g, w - 8, y, 3.5, c.red);
      return;
    }
    const a = Math.min(1, t / 0.3);
    g.ctx.globalAlpha = 1 - a;
    dot(g, 8, y, 3.5, c.red);
    g.ctx.globalAlpha = a;
    dot(g, w - 8, y, 3.5, c.red);
    g.ctx.globalAlpha = 1;
  },

  taste(g, t) {
    // The same move three ways: calm, playful, precise.
    const calm = cubicBezier(0.4, 0, 0.2, 1);
    const playfulS = spring(fromResponse(0.4, 0.35));
    const pd = playfulS.settleTime();
    const precise = steps(6, "jump-end");
    const eases = [calm, (x: number) => playfulS.position(x * pd), (x: number) => cubicBezier(0.2, 0.8, 0.2, 1)(precise(x))];
    eases.forEach((e, i) => travel(g, e, t, { y: 7 + i * ((g.h - 14) / 2), frames: 8, r: 2.5, active: 0.8, x1: g.w - 18 }));
  },

  infographics(g, t) {
    // Sort with object constancy: each bar keeps its identity as it moves.
    const { h, c } = g;
    const vals = [0.5, 0.9, 0.3, 0.7, 0.4];
    const sorted = [...vals.keys()].sort((a, b) => vals[b] - vals[a]);
    const p = t === null ? 0 : easeInOut(Math.max(0, Math.min(1, (t - 0.1) / 0.6)));
    vals.forEach((v, i) => {
      const from = i;
      const to = sorted.indexOf(i);
      const slot = from + (to - from) * p;
      const x = 10 + slot * 22;
      const bh = (h - 8) * v;
      if (t === null) {
        box(g, 10 + to * 22, h - 4 - bh, 14, bh, c.blue, null, 0.6);
        box(g, x, h - 4 - bh, 14, bh, null, c.ink, 0.85);
      } else box(g, x, h - 4 - bh, 14, bh, null, p > 0 && p < 1 ? c.red : c.ink);
    });
  },

  architecture(g, t) {
    // Tokens → primitives → patterns → policy: one signal travelling down the layers.
    const { w, h, c } = g;
    const layers = 4;
    const lh = (h - 6) / layers;
    for (let i = 0; i < layers; i++) {
      const y = 3 + i * lh;
      const lit = t !== null && Math.floor(t * layers * 1.2) === i;
      box(g, 8 + i * 8, y + 1, w - 16 - i * 16, lh - 3, lit ? null : c.rule, lit ? c.red : null);
    }
    if (t === null) box(g, 8, 4, w - 16, lh - 3, c.blue, null);
  },

  capstone(g, t) {
    // Keys and inbetweens: your own spacing chart.
    const { w, h, c } = g;
    const y = h / 2 + 4;
    const e = keyframes([
      { at: 0, value: 0 },
      { at: 0.5, value: 0.7, ease: easeOut },
      { at: 1, value: 1, ease: easeInOut },
    ]);
    line(g, 8, y, w - 8, y, c.rule);
    for (let i = 0; i <= 12; i++) {
      const x = 8 + (w - 16) * e(i / 12);
      const key = i === 0 || i === 6 || i === 12;
      if (key) ring(g, x, y, 4, c.red);
      else line(g, x, y - 3, x, y + 3, c.blue);
    }
    if (t !== null) dot(g, 8 + (w - 16) * e(Math.min(1, t / 0.8)), y - 11, 3, c.red);
  },
};

export function readPencils(el: Element = document.documentElement): Pencils {
  const s = getComputedStyle(el);
  const v = (n: string) => s.getPropertyValue(n).trim();
  return {
    ink: v("--ink"),
    graphite: v("--graphite"),
    rule: v("--rule"),
    blue: v("--blue-pencil"),
    red: v("--red-pencil"),
    paper: v("--paper"),
  };
}
