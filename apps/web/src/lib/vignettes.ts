/**
 * Index vignettes: a small illustrated scene per chapter, acting out its idea.
 *
 * Style: objects, not diagrams. Paper cards with a soft shadow, a shaded ball, a chart, a screen;
 * ink for things, graphite for guides, blue pencil for motion (trails, ghosts), red for the key or
 * the one thing to watch. Each scene has a designed rest pose (drawn when t is null) and a loop
 * played on hover (t runs 0 → 1 over `period` seconds). Reduced motion only ever sees the rest pose.
 */
import { cubicBezier, spring, fromResponse } from "@inbetween/core";

export const VW = 176;
export const VH = 64;

export interface Palette {
  ink: string;
  graphite: string;
  rule: string;
  blue: string;
  red: string;
  paper: string;
  raised: string;
  dark: boolean;
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
  draw(v: V, t: number | null): void;
}

export function readPalette(el: Element = document.documentElement): Palette {
  const s = getComputedStyle(el);
  const g = (n: string) => s.getPropertyValue(n).trim();
  const paper = g("--paper");
  return {
    ink: g("--ink"),
    graphite: g("--graphite"),
    rule: g("--rule"),
    blue: g("--blue-pencil"),
    red: g("--red-pencil"),
    paper,
    raised: g("--paper-raised"),
    dark: luminance(paper) < 0.3,
  };
}

function luminance(color: string): number {
  const m = color.match(/#([0-9a-f]{6})/i);
  if (!m) return 1;
  const n = parseInt(m[1], 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

/* ---------------------------------------------------------------- timing */

const TAU = Math.PI * 2;
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
/** Local progress of t inside [a, b]. */
export const seg = (t: number, a: number, b: number) => clamp01((t - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeOut = cubicBezier(0.2, 0.8, 0.2, 1); // the site's --ease-out
export const easeInOut = cubicBezier(0.65, 0, 0.35, 1); // --ease-inout
export const easeIn = cubicBezier(0.4, 0, 1, 1); // --ease-in
/** A spring's normalised position over its settle time (overshoots when bounce > 0). */
export function springCurve(response: number, bounce: number) {
  const s = spring(fromResponse(response, bounce));
  const T = s.settleTime();
  return { T, at: (sec: number) => (sec >= T ? 1 : s.position(sec)) };
}

/* ---------------------------------------------------------------- drawing kit */

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

/** A paper card: raised fill, hairline edge, a soft shadow that grows with lift. */
export function card(v: V, x: number, y: number, w: number, h: number, o: { r?: number; lift?: number; alpha?: number; fill?: string; stroke?: string } = {}) {
  const { ctx, c } = v;
  const lift = o.lift ?? 1;
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.shadowColor = c.dark ? "rgba(0,0,0,0.55)" : "rgba(20,20,30,0.16)";
  ctx.shadowBlur = 4 + 6 * lift;
  ctx.shadowOffsetY = 1 + 2.5 * lift;
  rr(ctx, x, y, w, h, o.r ?? 5);
  ctx.fillStyle = o.fill ?? c.raised;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = o.stroke ?? c.rule;
  ctx.lineWidth = 1;
  rr(ctx, x + 0.5, y + 0.5, w - 1, h - 1, (o.r ?? 5) - 0.5);
  ctx.stroke();
  ctx.restore();
}

/** Placeholder text: a rounded bar. */
export function textLine(v: V, x: number, y: number, w: number, o: { h?: number; color?: string; alpha?: number } = {}) {
  const { ctx, c } = v;
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  rr(ctx, x, y, w, o.h ?? 3, (o.h ?? 3) / 2);
  ctx.fillStyle = o.color ?? (c.dark ? "rgba(236,234,228,0.18)" : "rgba(22,22,26,0.14)");
  ctx.fill();
  ctx.restore();
}

/** A shaded ball, squashable about its base (sx wider, sy flatter). */
export function ball(v: V, x: number, y: number, r: number, o: { color?: string; sx?: number; sy?: number; alpha?: number } = {}) {
  const { ctx, c } = v;
  const sx = o.sx ?? 1;
  const sy = o.sy ?? 1;
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.translate(x, y + r); // base of the ball
  ctx.scale(sx, sy);
  const g = ctx.createRadialGradient(-r * 0.35, -r * 1.35, r * 0.1, 0, -r, r * 1.05);
  const col = o.color ?? c.red;
  g.addColorStop(0, mix(col, "#ffffff", 0.45));
  g.addColorStop(0.55, col);
  g.addColorStop(1, mix(col, "#000000", 0.18));
  ctx.beginPath();
  ctx.arc(0, -r, r, 0, TAU);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

/** A contact shadow on the floor: wider and fainter the higher the thing is. */
export function floorShadow(v: V, x: number, floor: number, w: number, height01: number) {
  const { ctx, c } = v;
  const k = 1 - clamp01(height01) * 0.6;
  ctx.save();
  ctx.globalAlpha = (c.dark ? 0.5 : 0.22) * k;
  ctx.beginPath();
  ctx.ellipse(x, floor, (w / 2) * (1.3 - 0.3 * k), 1.6 * k + 0.6, 0, 0, TAU);
  ctx.fillStyle = c.dark ? "#000" : "#1a1a22";
  ctx.fill();
  ctx.restore();
}

export function line(v: V, x1: number, y1: number, x2: number, y2: number, color: string, o: { width?: number; alpha?: number; dash?: number[] } = {}) {
  const { ctx } = v;
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
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

/** An onion-skin ghost: a thin blue-pencil ring. */
export function ghostRing(v: V, x: number, y: number, r: number, alpha = 0.55) {
  const { ctx, c } = v;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = c.blue;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.stroke();
  ctx.restore();
}

/** Mix two #rrggbb colours (other formats pass through unchanged). */
export function mix(a: string, b: string, t: number): string {
  const pa = a.match(/^#([0-9a-f]{6})$/i);
  const pb = b.match(/^#([0-9a-f]{6})$/i);
  if (!pa || !pb) return a;
  const na = parseInt(pa[1], 16);
  const nb = parseInt(pb[1], 16);
  const ch = (s: number) => Math.round(lerp((na >> s) & 255, (nb >> s) & 255, t));
  return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
}

/** A pointer arrow. `press` squeezes it a little, as a click does. */
export function cursor(v: V, x: number, y: number, press = 0) {
  const { ctx, c } = v;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(1 - press * 0.12, 1 - press * 0.12);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, 13);
  ctx.lineTo(3.4, 10);
  ctx.lineTo(5.8, 15);
  ctx.lineTo(7.6, 14.2);
  ctx.lineTo(5.3, 9.3);
  ctx.lineTo(9.6, 9.3);
  ctx.closePath();
  ctx.shadowColor = c.dark ? "rgba(0,0,0,0.6)" : "rgba(20,20,30,0.25)";
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1;
  ctx.fillStyle = c.ink;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = c.paper;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

/** An isometric plate: a flat slab seen from above at an angle (top face, then its two edges). */
export function plate(v: V, cx: number, cy: number, w: number, d: number, o: { color?: string; t?: number; alpha?: number } = {}) {
  const { ctx, c } = v;
  const th = o.t ?? 3;
  const col = o.color ?? c.raised;
  const top = [
    [cx, cy - d],
    [cx + w, cy],
    [cx, cy + d],
    [cx - w, cy],
  ];
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  // edges
  ctx.beginPath();
  ctx.moveTo(cx - w, cy);
  ctx.lineTo(cx, cy + d);
  ctx.lineTo(cx, cy + d + th);
  ctx.lineTo(cx - w, cy + th);
  ctx.closePath();
  ctx.fillStyle = mix(col, "#000000", c.dark ? 0.35 : 0.12);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + w, cy);
  ctx.lineTo(cx, cy + d);
  ctx.lineTo(cx, cy + d + th);
  ctx.lineTo(cx + w, cy + th);
  ctx.closePath();
  ctx.fillStyle = mix(col, "#000000", c.dark ? 0.5 : 0.2);
  ctx.fill();
  // top
  ctx.beginPath();
  top.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fillStyle = col;
  ctx.fill();
  ctx.strokeStyle = c.dark ? "rgba(255,255,255,0.12)" : "rgba(20,20,30,0.12)";
  ctx.stroke();
  ctx.restore();
}

/** A phone: a tall card with a speaker slit; returns its screen rect. */
export function phone(v: V, x: number, y: number, w: number, h: number) {
  card(v, x, y, w, h, { r: 6, lift: 0.8 });
  textLine(v, x + w / 2 - 5, y + 3, 10, { h: 1.6 });
  return { x: x + 3, y: y + 7, w: w - 6, h: h - 10 };
}

/** A dashed blue-pencil outline of a rect: where something was. */
export function ghostOutline(v: V, r: { x: number; y: number; w: number; h: number }, radius = 4) {
  const { ctx, c } = v;
  ctx.save();
  ctx.setLineDash([2, 2.5]);
  ctx.strokeStyle = c.blue;
  ctx.globalAlpha = 0.7;
  rr(ctx, r.x - 3.5, r.y - 3.5, r.w + 7, r.h + 7, radius + 2);
  ctx.stroke();
  ctx.restore();
}

/* ---------------------------------------------------------------- scenes */

export const vignettes: Record<string, Vignette> = {
  /** 05 · Springs: a notification card pops in on a spring, overshoots a touch, and settles. */
  springs: {
    period: 2.4,
    draw(v, t) {
      const { c, w, h, ctx } = v;
      const s = springCurve(0.42, 0.42);
      const W = 104, H = 36;
      const x = (w - W) / 2, y = (h - H) / 2 + 1;
      let p = 1;
      let alpha = 1;
      if (t !== null) {
        const sec = t * 2.4;
        p = sec < 0.25 ? 0 : s.at(sec - 0.25);
        alpha = t > 0.88 ? 1 - seg(t, 0.88, 0.98) : 1;
      }
      if (t === null) {
        // Rest: the settled card, with the overshoot it passed through drawn as a dashed outline.
        ctx.save();
        ctx.setLineDash([2, 2.5]);
        ctx.strokeStyle = c.blue;
        ctx.globalAlpha = 0.7;
        const k = 1.1;
        rr(ctx, w / 2 - (W * k) / 2 + 0.5, y + H / 2 - (H * k) / 2 - 2 + 0.5, W * k - 1, H * k - 1, 6);
        ctx.stroke();
        ctx.restore();
      }
      const scale = lerp(0.55, 1, p);
      ctx.save();
      ctx.globalAlpha = clamp01(p * 3) * alpha;
      ctx.translate(w / 2, y + H);
      ctx.scale(scale, scale);
      ctx.translate(-w / 2, -(y + H));
      card(v, x, y - (1 - p) * 6, W, H, { r: 7, lift: 0.6 + 0.8 * Math.abs(1 - p) });
      // Avatar, text, and a red badge that lands last
      const ay = y + H / 2 - (1 - p) * 6;
      ctx.beginPath();
      ctx.arc(x + 17, ay, 8, 0, TAU);
      ctx.fillStyle = mix(c.blue, c.paper, 0.55);
      ctx.fill();
      textLine(v, x + 31, ay - 7, 48, { h: 4, color: c.dark ? "rgba(236,234,228,0.5)" : "rgba(22,22,26,0.55)" });
      textLine(v, x + 31, ay + 1, 62);
      textLine(v, x + 31, ay + 7, 36);
      ctx.restore();
      const b = t === null ? 1 : clamp01(p * 1.4 - 0.4);
      if (b > 0) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(x + W - 3, y + 3 - (1 - p) * 6);
        ctx.scale(b, b);
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, TAU);
        ctx.fillStyle = c.red;
        ctx.fill();
        ctx.restore();
      }
    },
  },

  /** 23 · Infographics: bars re-sort by value and keep who they are; the tracked bar is red. */
  infographics: {
    period: 3.2,
    draw(v, t) {
      const { c, w, h, ctx } = v;
      const A = [0.55, 0.9, 0.35, 0.7, 0.5];
      const B = [0.8, 0.45, 0.95, 0.3, 0.62];
      const orderOf = (vals: number[]) => vals.map((_, i) => i).sort((a, b) => vals[b] - vals[a]);
      const base = h - 8, top = 8, bw = 18, gap = 9;
      const x0 = (w - (5 * bw + 4 * gap)) / 2;
      line(v, x0 - 6, base + 0.5, x0 + 5 * bw + 4 * gap + 6, base + 0.5, c.graphite, { alpha: 0.7 });
      for (let k = 1; k <= 3; k++) line(v, x0 - 6, base - (k * (base - top)) / 3, x0 + 5 * bw + 4 * gap + 6, base - (k * (base - top)) / 3, c.rule, { alpha: 0.8 });
      // 0 → 0.4: A, sorted by index; 0.4 → 0.6: values change; 0.6 → 0.8: bars re-sort; hold; back.
      let vals = B, slotOf = orderOf(B);
      let from = B, to = B, pv = 1, fromSlot = orderOf(B), toSlot = orderOf(B), ps = 1;
      if (t !== null) {
        const back = t > 0.5;
        const u = back ? t - 0.5 : t;
        from = back ? B : A; to = back ? A : B;
        pv = easeInOut(seg(u, 0.06, 0.22));
        fromSlot = orderOf(from); toSlot = orderOf(to);
        ps = easeInOut(seg(u, 0.24, 0.42));
        vals = from.map((a, i) => lerp(a, to[i], pv));
        slotOf = fromSlot;
      }
      for (let i = 0; i < 5; i++) {
        const s0 = fromSlot.indexOf(i), s1 = toSlot.indexOf(i);
        const slot = t === null ? slotOf.indexOf(i) : lerp(s0, s1, ps);
        const x = x0 + slot * (bw + gap);
        const hh = vals[i] * (base - top);
        const tracked = i === 2;
        ctx.save();
        const g = ctx.createLinearGradient(0, base - hh, 0, base);
        const col = tracked ? c.red : c.dark ? mix(c.blue, "#000000", 0.1) : c.blue;
        g.addColorStop(0, col);
        g.addColorStop(1, mix(col, c.paper, tracked ? 0.25 : 0.45));
        rr(ctx, x, base - hh, bw, hh, 2.5);
        ctx.globalAlpha = tracked ? 1 : 0.75;
        ctx.fillStyle = g;
        ctx.fill();
        ctx.restore();
      }
    },
  },
  /** 09 · Enter, exit, change: a toast arrives with room to breathe, its spinner becomes a tick, and it leaves quickly. */
  "enter-exit": {
    period: 3,
    draw(v, t) {
      const { c, w, h, ctx } = v;
      const W = 112, H = 26, x = (w - W) / 2, restY = h / 2 - H / 2;
      let y = restY, alpha = 1, done = 1, spin = 0;
      if (t !== null) {
        const enter = easeOut(seg(t, 0.04, 0.3));
        const exit = easeIn(seg(t, 0.84, 0.94));
        y = restY + (1 - enter) * 22 + exit * 16;
        alpha = enter * (1 - exit);
        done = easeOut(seg(t, 0.55, 0.66));
        spin = t * 9;
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      card(v, x, y, W, H, { r: 13, lift: 0.8 });
      const ix = x + 14, iy = y + H / 2;
      if (done < 1) {
        ctx.save();
        ctx.globalAlpha = alpha * (1 - done);
        ctx.strokeStyle = c.blue;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(ix, iy, 6, spin, spin + Math.PI * 1.4);
        ctx.stroke();
        ctx.restore();
      }
      if (done > 0) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(ix, iy, 7 * (0.6 + 0.4 * done), 0, TAU);
        ctx.fillStyle = c.red;
        ctx.fill();
        ctx.strokeStyle = c.paper;
        ctx.lineWidth = 1.6;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        const d = done;
        ctx.moveTo(ix - 3, iy);
        ctx.lineTo(ix - 3 + 2 * Math.min(1, d * 2), iy + 2 * Math.min(1, d * 2));
        if (d > 0.5) ctx.lineTo(ix - 1 + 4.5 * ((d - 0.5) * 2), iy + 2 - 4.5 * ((d - 0.5) * 2));
        ctx.stroke();
        ctx.restore();
      }
      textLine(v, x + 28, iy - 5, 52, { h: 3.5, color: c.dark ? "rgba(236,234,228,0.5)" : "rgba(22,22,26,0.5)" });
      textLine(v, x + 28, iy + 2, 70);
      ctx.restore();
    },
  },

  /** 10 · Object permanence: a thumbnail grows into its own detail view, and back into its place. */
  permanence: {
    period: 3,
    draw(v, t) {
      const { c, w, h, ctx } = v;
      const tiles = [0, 1, 2].map((i) => ({ x: 26 + i * 44, y: h / 2 - 11, w: 36, h: 24 }));
      const big = { x: 30, y: 6, w: w - 60, h: h - 12 };
      const chosen = 1;
      let p = 0;
      if (t !== null) p = easeInOut(seg(t, 0.12, 0.34)) * (1 - easeInOut(seg(t, 0.66, 0.88)));
      const photo = (r: { x: number; y: number; w: number; h: number }, active: boolean, alpha = 1) => {
        ctx.save();
        ctx.globalAlpha = alpha;
        card(v, r.x, r.y, r.w, r.h, { r: 4, lift: active ? 0.4 + p * 1.2 : 0.3 });
        rr(ctx, r.x + 2, r.y + 2, r.w - 4, r.h - 4, 3);
        ctx.clip();
        ctx.fillStyle = active ? mix(c.blue, c.paper, 0.65) : mix(c.blue, c.paper, 0.85);
        ctx.fillRect(r.x, r.y, r.w, r.h);
        // A little landscape: a sun and two hills
        ctx.beginPath();
        ctx.arc(r.x + r.w * 0.72, r.y + r.h * 0.34, r.h * 0.13, 0, TAU);
        ctx.fillStyle = active ? c.red : mix(c.red, c.paper, 0.5);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(r.x, r.y + r.h);
        ctx.lineTo(r.x + r.w * 0.35, r.y + r.h * 0.5);
        ctx.lineTo(r.x + r.w * 0.6, r.y + r.h * 0.78);
        ctx.lineTo(r.x + r.w * 0.78, r.y + r.h * 0.6);
        ctx.lineTo(r.x + r.w, r.y + r.h);
        ctx.closePath();
        ctx.fillStyle = mix(c.blue, "#000000", 0.05);
        ctx.fill();
        ctx.restore();
      };
      tiles.forEach((r, i) => { if (i !== chosen) photo(r, false, 1 - p * 0.6); });
      const a = tiles[chosen];
      photo({ x: lerp(a.x, big.x, p), y: lerp(a.y, big.y, p), w: lerp(a.w, big.w, p), h: lerp(a.h, big.h, p) }, true);
      if (t === null) ghostOutline(v, tiles[chosen]);
    },
  },

  /** 11 · Spatial models: a new screen pushes in from the right; the old one steps back into depth. */
  spatial: {
    period: 3.2,
    draw(v, t) {
      const { c, w, h, ctx } = v;
      const W = 50, H = 52, y = (h - H) / 2, cx = w / 2 - W / 2;
      let p = 1;
      if (t !== null) p = easeInOut(seg(t, 0.1, 0.36)) * (1 - easeInOut(seg(t, 0.62, 0.86)));
      const screen = (x: number, s: number, dim: number, accent: boolean) => {
        ctx.save();
        ctx.translate(x + W / 2, y + H / 2);
        ctx.scale(s, s);
        ctx.translate(-(x + W / 2), -(y + H / 2));
        const sc = phone(v, x, y, W, H);
        rr(ctx, sc.x + 3, sc.y + 3, sc.w - 6, 12, 2);
        ctx.fillStyle = accent ? mix(c.red, c.paper, 0.35) : mix(c.blue, c.paper, 0.6);
        ctx.fill();
        textLine(v, sc.x + 3, sc.y + 20, sc.w - 12);
        textLine(v, sc.x + 3, sc.y + 26, sc.w - 18);
        textLine(v, sc.x + 3, sc.y + 32, sc.w - 10);
        if (dim > 0) {
          rr(ctx, x, y, W, H, 6);
          ctx.fillStyle = c.dark ? `rgba(0,0,0,${0.45 * dim})` : `rgba(245,243,238,${0.55 * dim})`;
          ctx.fill();
        }
        ctx.restore();
      };
      screen(cx - 34 * p, 1 - 0.1 * p, p, false);
      screen(lerp(w + 4, cx + 14, p), 1, 0, true);
      // Direction: a chevron under the new screen while it moves
      if (t !== null && p > 0.05 && p < 0.95) line(v, cx + 40, h - 3, cx + 50, h - 3, c.blue, { width: 1.5, alpha: 0.7 });
    },
  },

  /** 12 · Direct manipulation: a cursor drags a card; past the edge it resists, and on release it springs home. */
  direct: {
    period: 3,
    draw(v, t) {
      const { c, w, h, ctx } = v;
      const W = 46, H = 30, y = h / 2 - H / 2 + 2, home = 22, limit = 86;
      let dx = 0, press = 0, cx = home + W / 2 + 6, cy = y + H / 2, stretch = 0;
      if (t !== null) {
        const grab = seg(t, 0.06, 0.14);
        const drag = easeInOut(seg(t, 0.14, 0.5)); // the finger's travel
        const finger = drag * 110;
        const release = seg(t, 0.56, 1);
        press = grab > 0 && t < 0.56 ? 1 : 0;
        // 1:1 up to the limit, then rubber-banding: it follows less and less.
        const over = Math.max(0, finger - limit);
        const held = Math.min(finger, limit) + limit * (1 - 1 / (over / limit + 1)) * 0.55;
        const s = springCurve(0.45, 0.3);
        dx = t < 0.56 ? held : held * (1 - s.at(release * 3));
        stretch = t < 0.56 ? Math.min(1, over / 40) * 0.12 : 0;
        cx = home + W / 2 + 6 + (t < 0.56 ? finger : held + (t - 0.56) * 60);
        cy = y + H / 2 + (t < 0.56 ? 0 : -seg(t, 0.56, 0.7) * 6);
      }
      // The edge it can't pass without resistance
      line(v, home + limit + W + 2, 8, home + limit + W + 2, h - 8, c.blue, { dash: [2, 3], alpha: 0.8 });
      card(v, home + dx, y, W * (1 + stretch), H, { r: 6, lift: 0.5 + press * 0.8 });
      textLine(v, home + dx + 7, y + 9, 22, { h: 3.5, color: c.dark ? "rgba(236,234,228,0.5)" : "rgba(22,22,26,0.5)" });
      textLine(v, home + dx + 7, y + 17, 30);
      ctx.save();
      ctx.beginPath();
      ctx.arc(home + dx + W * (1 + stretch) - 9, y + 9, 3.5, 0, TAU);
      ctx.fillStyle = c.red;
      ctx.fill();
      ctx.restore();
      cursor(v, cx, cy, press);
    },
  },

  /** 13 · Scroll as time: a phone scrolls, and a sun rises with it. The scroll is the clock. */
  scroll: {
    period: 3.6,
    draw(v, t) {
      const { c, w, h, ctx } = v;
      const W = 42, H = 58, x = w / 2 - W / 2, y = 3;
      let p = 0.55;
      if (t !== null) p = easeInOut(seg(t, 0.08, 0.6)) * (1 - easeInOut(seg(t, 0.72, 0.94)));
      const sc = phone(v, x, y, W, H);
      ctx.save();
      rr(ctx, sc.x, sc.y, sc.w, sc.h, 3);
      ctx.clip();
      // Sky brightening, a sun rising over a hill: driven by scroll, not by time.
      const sky = ctx.createLinearGradient(0, sc.y, 0, sc.y + sc.h);
      sky.addColorStop(0, mix(c.blue, c.paper, lerp(0.75, 0.9, p)));
      sky.addColorStop(1, c.paper);
      ctx.fillStyle = sky;
      ctx.fillRect(sc.x, sc.y, sc.w, sc.h);
      ctx.beginPath();
      ctx.arc(sc.x + sc.w / 2, lerp(sc.y + sc.h - 8, sc.y + 13, p), lerp(4, 7, p), 0, TAU);
      ctx.fillStyle = c.red;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(sc.x, sc.y + sc.h);
      ctx.quadraticCurveTo(sc.x + sc.w / 2, sc.y + sc.h - 16, sc.x + sc.w, sc.y + sc.h);
      ctx.fillStyle = mix(c.blue, c.paper, 0.4);
      ctx.fill();
      ctx.restore();
      // Scroll thumb, and a progress bar along the top
      rr(ctx, x + W - 2.5, lerp(sc.y + 2, sc.y + sc.h - 14, p), 1.6, 12, 0.8);
      ctx.fillStyle = c.graphite;
      ctx.fill();
      rr(ctx, sc.x + 2, sc.y + 1, (sc.w - 4) * p, 1.6, 0.8);
      ctx.fillStyle = c.red;
      ctx.fill();
      // Blue-pencil arrows either side while scrolling
      if (t !== null && ((t > 0.1 && t < 0.6) || (t > 0.74 && t < 0.92))) {
        const dir = t < 0.6 ? 1 : -1;
        for (const sx of [x - 12, x + W + 12]) {
          line(v, sx, h / 2 - 6 * dir, sx, h / 2 + 6 * dir, c.blue, { alpha: 0.7 });
          line(v, sx, h / 2 + 6 * dir, sx - 3, h / 2 + 3 * dir, c.blue, { alpha: 0.7 });
          line(v, sx, h / 2 + 6 * dir, sx + 3, h / 2 + 3 * dir, c.blue, { alpha: 0.7 });
        }
      }
    },
  },

  /** 15 · Easing by hand: a dot chases the cursor, covering a share of the gap each frame. */
  "easing-hand": {
    period: 3.2,
    draw(v, t) {
      const { c, w, h } = v;
      const pts = [
        { x: 30, y: 44 },
        { x: 92, y: 18 },
        { x: 148, y: 40 },
      ];
      const target = (tt: number) => {
        const seq = [0, 1, 2, 1, 0];
        const u = (tt % 1) * (seq.length - 1);
        const i = Math.floor(u);
        const f = easeInOut(clamp01((u - i) * 2.2));
        const a = pts[seq[i]], b = pts[seq[Math.min(seq.length - 1, i + 1)]];
        return { x: lerp(a.x, b.x, f), y: lerp(a.y, b.y, f) };
      };
      const tt = t ?? 0.3;
      // Simulate the chaser from the loop's start: x += (target − x) · (1 − e^(−λ·dt))
      const dt = 1 / 60, steps = Math.round((tt * this.period) / dt);
      let d = { ...pts[0] };
      const trail: { x: number; y: number }[] = [];
      for (let s = 0; s <= steps; s++) {
        const g = target((s * dt) / this.period);
        const k = 1 - Math.exp(-5 * dt);
        d = { x: d.x + (g.x - d.x) * k, y: d.y + (g.y - d.y) * k };
        if (s % 4 === 0) trail.push({ ...d });
      }
      trail.slice(-10).forEach((p, i, arr) => ghostRing(v, p.x, p.y, 3.5, 0.12 + (0.4 * i) / arr.length));
      const g = target(tt);
      line(v, d.x, d.y, g.x, g.y, c.blue, { dash: [2, 2.5], alpha: 0.6 });
      ball(v, d.x, d.y - 4.5, 4.5);
      cursor(v, g.x, g.y);
    },
  },

  /** 20 · Performance: three layers, stacked like a compositor's. Only the top one moves; the others never repaint. */
  performance: {
    period: 2.8,
    draw(v, t) {
      const { c, w, h, ctx } = v;
      const W = 70, H = 30, cx = w / 2 - W / 2;
      // The still layers, set back and dimmed: layout and paint, left alone.
      card(v, cx - 12, h / 2 - H / 2 + 8, W, H, { r: 5, lift: 0.2, alpha: 0.55 });
      card(v, cx - 6, h / 2 - H / 2 + 4, W, H, { r: 5, lift: 0.3, alpha: 0.8 });
      textLine(v, cx - 6 + 8, h / 2 + 7, 30, { alpha: 0.6 });
      // The composited layer glides over them.
      const slide = t === null ? 10 : Math.sin(t * TAU) * 16 + 10;
      if (t !== null) {
        for (let k = 3; k >= 1; k--) {
          const sk = Math.sin((t - k * 0.02) * TAU) * 16 + 10;
          ctx.save();
          ctx.globalAlpha = 0.12 * (4 - k);
          rr(ctx, cx + sk + 0.5, h / 2 - H / 2 - 4 + 0.5, W - 1, H - 1, 5);
          ctx.strokeStyle = c.blue;
          ctx.stroke();
          ctx.restore();
        }
      }
      card(v, cx + slide, h / 2 - H / 2 - 4, W, H, { r: 5, lift: 1 });
      ctx.beginPath();
      ctx.arc(cx + slide + 12, h / 2 - 4 - 1, 5, 0, TAU);
      ctx.fillStyle = c.red;
      ctx.fill();
      textLine(v, cx + slide + 22, h / 2 - 8, 36, { h: 3.5, color: c.dark ? "rgba(236,234,228,0.5)" : "rgba(22,22,26,0.5)" });
      textLine(v, cx + slide + 22, h / 2 - 1, 28);
    },
  },

  /** 21 · Care: a restless wave settles into a gentle one. Reduced, never removed. */
  care: {
    period: 3.6,
    draw(v, t) {
      const { c, w, h, ctx } = v;
      const cy = h / 2 + 2;
      let calm = 1;
      if (t !== null) calm = easeInOut(seg(t, 0.2, 0.55)) * (1 - easeInOut(seg(t, 0.8, 0.98)));
      const amp = lerp(17, 4, calm), freq = lerp(3.6, 1.2, calm);
      const phase = (t ?? 0.3) * TAU * 2;
      const yAt = (x: number) => cy + Math.sin((x / w) * TAU * freq - phase) * amp * Math.sin((x / w) * Math.PI);
      ctx.save();
      ctx.strokeStyle = c.blue;
      ctx.lineWidth = 1.6;
      ctx.lineCap = "round";
      ctx.beginPath();
      for (let x = 10; x <= w - 10; x += 2) (x === 10 ? ctx.moveTo(x, yAt(x)) : ctx.lineTo(x, yAt(x)));
      ctx.stroke();
      ctx.restore();
      const bx = w * 0.62;
      ball(v, bx, yAt(bx) - 4.5, 4.5);
      // The same wave as it was, faint: nothing was taken away, only reduced
      if (calm > 0.5) {
        ctx.save();
        ctx.globalAlpha = 0.2 * (calm - 0.5) * 2;
        ctx.strokeStyle = c.graphite;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        for (let x = 10; x <= w - 10; x += 2) {
          const yy = cy + Math.sin((x / w) * TAU * 3.6 - phase) * 17 * Math.sin((x / w) * Math.PI);
          x === 10 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
        }
        ctx.stroke();
        ctx.restore();
      }
    },
  },

  /** 22 · Taste: one checkbox, ticked with care: a small press, a quick clean stroke, nothing more. */
  taste: {
    period: 2.8,
    draw(v, t) {
      const { c, w, h, ctx } = v;
      const S = 26, x = w / 2 - S / 2, y = h / 2 - S / 2;
      let press = 0, fill = 1, tick = 1;
      if (t !== null) {
        const tap = seg(t, 0.12, 0.2);
        press = Math.sin(tap * Math.PI);
        fill = easeOut(seg(t, 0.16, 0.3));
        tick = easeOut(seg(t, 0.22, 0.4));
        const off = easeIn(seg(t, 0.82, 0.92));
        fill *= 1 - off;
        tick *= 1 - off;
      }
      const k = 1 - press * 0.08;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.scale(k, k);
      ctx.translate(-w / 2, -h / 2);
      card(v, x, y, S, S, { r: 7, lift: 0.6 - press * 0.4 });
      if (fill > 0) {
        rr(ctx, x + 1, y + 1, S - 2, S - 2, 6.5);
        ctx.fillStyle = c.red;
        ctx.globalAlpha = fill;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (tick > 0) {
        const a = { x: x + 7.5, y: y + 13.5 }, b = { x: x + 11.5, y: y + 17.5 }, e = { x: x + 19, y: y + 9 };
        const l1 = Math.hypot(b.x - a.x, b.y - a.y), l2 = Math.hypot(e.x - b.x, e.y - b.y);
        const d = tick * (l1 + l2);
        ctx.strokeStyle = c.paper;
        ctx.lineWidth = 2.2;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        if (d <= l1) ctx.lineTo(lerp(a.x, b.x, d / l1), lerp(a.y, b.y, d / l1));
        else {
          ctx.lineTo(b.x, b.y);
          ctx.lineTo(lerp(b.x, e.x, (d - l1) / l2), lerp(b.y, e.y, (d - l1) / l2));
        }
        ctx.stroke();
      }
      ctx.restore();
    },
  },

  /** 24 · Motion architecture: tokens, primitives, patterns, policy, landing one on another into a system. */
  architecture: {
    period: 3.4,
    draw(v, t) {
      const { c, w, h } = v;
      const cx = w / 2, base = h - 14;
      const colors = [mix(c.blue, c.paper, 0.85), mix(c.blue, c.paper, 0.65), mix(c.blue, c.paper, 0.45), c.red];
      const drop = springCurve(0.35, 0.3);
      for (let i = 0; i < 4; i++) {
        let p = 1, alpha = 1;
        if (t !== null) {
          const start = 0.06 + i * 0.12;
          p = t < start ? 0 : drop.at((t - start) * 3.4);
          alpha = t < start ? 0 : 1;
          if (t > 0.9) alpha *= 1 - seg(t, 0.9, 0.98);
        }
        if (alpha <= 0) continue;
        const y = base - i * 9 - (1 - p) * 26;
        plate(v, cx, y, 40 - i * 5, 11 - i * 1.2, { color: colors[i], t: 3, alpha });
      }
    },
  },

  /** 25 · Your motion system: one screen assembles itself, piece by piece, in the order it was designed. */
  capstone: {
    period: 3.4,
    draw(v, t) {
      const { c, w, h, ctx } = v;
      const W = 110, H = 56, x = (w - W) / 2, y = (h - H) / 2;
      const at = (a: number) => (t === null ? 1 : easeOut(seg(t, a, a + 0.14)));
      const gone = t === null ? 0 : easeIn(seg(t, 0.88, 0.97));
      ctx.save();
      ctx.globalAlpha = 1 - gone;
      card(v, x, y, W, H, { r: 6, lift: 0.8 });
      // Header bar slides down
      const hb = at(0.06);
      ctx.save();
      ctx.globalAlpha = (1 - gone) * hb;
      rr(ctx, x + 6, y + 5 - (1 - hb) * 5, W - 12, 7, 2);
      ctx.fillStyle = mix(c.blue, c.paper, 0.7);
      ctx.fill();
      ctx.restore();
      // Hero block scales in
      const hero = at(0.16);
      ctx.save();
      ctx.globalAlpha = (1 - gone) * hero;
      const hw = 40 * (0.8 + 0.2 * hero);
      rr(ctx, x + 6, y + 16, hw, 30, 3);
      ctx.fillStyle = mix(c.blue, c.paper, 0.45);
      ctx.fill();
      ctx.restore();
      // Text lines rise in, a stagger apart
      [0.26, 0.31, 0.36].forEach((a, i) => {
        const p = at(a);
        textLine(v, x + 52, y + 19 + i * 7 + (1 - p) * 4, [44, 36, 40][i], { alpha: (1 - gone) * p });
      });
      // The button pops on a spring, last
      const btn = t === null ? 1 : springCurve(0.35, 0.4).at(Math.max(0, t - 0.44) * 3.4);
      if (btn > 0) {
        ctx.save();
        ctx.translate(x + 70, y + 44);
        ctx.scale(btn, btn);
        rr(ctx, -18, -4.5, 36, 9, 4.5);
        ctx.fillStyle = c.red;
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    },
  },

  /** 01 · Motion is information: a press, and a menu grows out of the button that caused it. */
  information: {
    period: 3,
    draw(v, t) {
      const { c, ctx } = v;
      const bx = 34, by = 8, bw = 44, bh = 15;
      let open = 1, press = 0, hover = 1, cx = bx + 30, cy = by + 40, cursorAlpha = 1;
      if (t !== null) {
        const reach = easeInOut(seg(t, 0.04, 0.2));
        cx = lerp(bx + 80, bx + 30, reach);
        cy = lerp(by + 44, by + 9, reach);
        press = Math.sin(seg(t, 0.2, 0.27) * Math.PI);
        open = easeOut(seg(t, 0.25, 0.4)) * (1 - easeIn(seg(t, 0.84, 0.92)));
        const down = easeInOut(seg(t, 0.46, 0.58));
        cx = t > 0.4 ? lerp(bx + 30, bx + 36, down) : cx;
        cy = t > 0.4 ? lerp(by + 9, by + 38, down) : cy;
        hover = seg(t, 0.52, 0.6);
        cursorAlpha = 1 - seg(t, 0.9, 0.97);
      }
      // The button, pressed in for a moment
      ctx.save();
      ctx.translate(bx + bw / 2, by + bh / 2);
      ctx.scale(1 - press * 0.06, 1 - press * 0.06);
      ctx.translate(-(bx + bw / 2), -(by + bh / 2));
      card(v, bx, by, bw, bh, { r: 5, lift: 0.5 - press * 0.4 });
      textLine(v, bx + 7, by + 6, 20, { h: 3.5, color: c.dark ? "rgba(236,234,228,0.55)" : "rgba(22,22,26,0.55)" });
      line(v, bx + bw - 12, by + 6.5, bx + bw - 9.5, by + 9, c.graphite, { width: 1.2 });
      line(v, bx + bw - 9.5, by + 9, bx + bw - 7, by + 6.5, c.graphite, { width: 1.2 });
      ctx.restore();
      // The menu, growing out of the button's corner
      if (open > 0) {
        const mx = bx, my = by + bh + 4, mw = 74, mh = 36;
        ctx.save();
        ctx.globalAlpha = clamp01(open * 1.5);
        ctx.translate(mx, my);
        ctx.scale(lerp(0.4, 1, open), lerp(0.4, 1, open));
        ctx.translate(-mx, -my);
        card(v, mx, my, mw, mh, { r: 6, lift: 1 });
        [0, 1, 2].forEach((i) => {
          const ry = my + 5 + i * 10;
          if (i === 1 && hover > 0) {
            ctx.save();
            ctx.globalAlpha = clamp01(open * 1.5) * hover;
            rr(ctx, mx + 3, ry - 1, mw - 6, 9, 3);
            ctx.fillStyle = mix(c.red, c.paper, 0.85);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(mx + 9, ry + 3.5, 2, 0, TAU);
            ctx.fillStyle = c.red;
            ctx.fill();
            ctx.restore();
          }
          textLine(v, mx + 15, ry + 2, [36, 44, 30][i]);
        });
        ctx.restore();
      }
      ctx.save();
      ctx.globalAlpha = cursorAlpha;
      cursor(v, cx, cy, press);
      ctx.restore();
    },
  },

  /** 02 · Timing: a card slides in while a playhead scrubs the frame ruler; each frame leaves a ghost. */
  timing: {
    period: 2.6,
    draw(v, t) {
      const { c, w, h, ctx } = v;
      const x0 = 20, x1 = w - 62, cw = 42, ch = 22, cy = 9;
      const rx0 = 20, rx1 = w - 20, ry = h - 12, frames = 24;
      const p = t === null ? 1 : seg(t, 0.06, 0.72);
      // Ghosts: the card at every fourth frame so far
      for (let f = 0; f < frames; f += 4) {
        if (f / frames > p) break;
        const gx = lerp(x0, x1, easeOut(f / frames));
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = c.blue;
        rr(ctx, gx + 0.5, cy + 0.5, cw - 1, ch - 1, 5);
        ctx.stroke();
        ctx.restore();
      }
      const x = lerp(x0, x1, easeOut(p));
      card(v, x, cy, cw, ch, { r: 5, lift: 0.7 });
      ctx.beginPath();
      ctx.arc(x + 9, cy + ch / 2, 4, 0, TAU);
      ctx.fillStyle = c.red;
      ctx.fill();
      textLine(v, x + 17, cy + 7, 18, { h: 3 });
      textLine(v, x + 17, cy + 13, 14);
      // The frame ruler: a tick per frame, and the playhead
      for (let f = 0; f <= frames; f++) {
        const fx = lerp(rx0, rx1, f / frames);
        line(v, fx, ry + (f % 6 === 0 ? -3 : 0), fx, ry + 4, c.graphite, { alpha: f / frames <= p ? 0.9 : 0.4 });
      }
      const px = lerp(rx0, rx1, p);
      line(v, px, ry - 6, px, ry + 5, c.red, { width: 1.5 });
      ctx.beginPath();
      ctx.arc(px, ry - 7, 2.2, 0, TAU);
      ctx.fillStyle = c.red;
      ctx.fill();
    },
  },

  /** 03 · Spacing: a slider thumb eases to its value; its frames bunch up as it slows. */
  spacing: {
    period: 2.6,
    draw(v, t) {
      const { c, w, h, ctx } = v;
      const x0 = 22, x1 = w - 22, y = h / 2 + 6, to = 0.78;
      let p = 1, ghostAlpha = 1;
      if (t !== null) {
        p = easeOut(seg(t, 0.08, 0.6)) * (1 - easeInOut(seg(t, 0.84, 0.96)));
        ghostAlpha = 1 - seg(t, 0.8, 0.86);
      }
      const tx = lerp(x0, lerp(x0, x1, to), p);
      // Track and fill
      rr(ctx, x0, y - 2, x1 - x0, 4, 2);
      ctx.fillStyle = c.dark ? "rgba(236,234,228,0.14)" : "rgba(22,22,26,0.1)";
      ctx.fill();
      rr(ctx, x0, y - 2, tx - x0, 4, 2);
      ctx.fillStyle = c.blue;
      ctx.fill();
      // Frame ghosts of the thumb, bunching toward the end
      const frames = 12, travel = t === null ? 1 : seg(t, 0.08, 0.6);
      for (let f = 0; f < frames; f++) {
        if (f / frames > travel) break;
        ghostRing(v, lerp(x0, lerp(x0, x1, to), easeOut(f / frames)), y, 6.5, 0.45 * ghostAlpha);
      }
      // Thumb, and its value above it
      ctx.save();
      ctx.shadowColor = c.dark ? "rgba(0,0,0,0.6)" : "rgba(20,20,30,0.22)";
      ctx.shadowBlur = 5;
      ctx.shadowOffsetY = 2;
      ctx.beginPath();
      ctx.arc(tx, y, 7, 0, TAU);
      ctx.fillStyle = c.raised;
      ctx.fill();
      ctx.restore();
      ctx.beginPath();
      ctx.arc(tx, y, 6.5, 0, TAU);
      ctx.strokeStyle = c.rule;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(tx, y, 2.5, 0, TAU);
      ctx.fillStyle = c.red;
      ctx.fill();
      card(v, tx - 12, y - 24, 24, 12, { r: 4, lift: 0.5 });
      textLine(v, tx - 6, y - 19.5, 12, { h: 3, color: c.red });
    },
  },

  /** 04 · Weight: a light chip pops in, quick and springy; a heavy sheet rises slowly and settles. */
  weight: {
    period: 3,
    draw(v, t) {
      const { c, w, h, ctx } = v;
      const base = h - 6;
      line(v, 10, base + 0.5, w - 10, base + 0.5, c.graphite, { alpha: 0.4 });
      let light = 1, heavy = 1, alpha = 1;
      if (t !== null) {
        const s = springCurve(0.3, 0.4);
        light = t < 0.08 ? 0 : s.at((t - 0.08) * 3);
        heavy = easeOut(seg(t, 0.08, 0.62));
        alpha = 1 - seg(t, 0.9, 0.97);
      }
      ctx.save();
      ctx.globalAlpha = alpha;
      // Light: a small chip, quick, overshoots a touch
      const lx = 26, lw = 38, lh = 14, ly = base - 8 - lh;
      ctx.save();
      ctx.globalAlpha = alpha * clamp01(light * 2);
      card(v, lx, ly + (1 - light) * 26, lw, lh, { r: 7, lift: 0.5 });
      ctx.beginPath();
      ctx.arc(lx + 8, ly + lh / 2 + (1 - light) * 26, 3, 0, TAU);
      ctx.fillStyle = c.blue;
      ctx.fill();
      textLine(v, lx + 14, ly + lh / 2 - 1.5 + (1 - light) * 26, 18, { h: 3 });
      ctx.restore();
      // Heavy: a big sheet, slow to start, slow to stop, no bounce
      const hx = 80, hw = 72, hh = 46, hy = base - hh;
      ctx.save();
      ctx.globalAlpha = alpha * clamp01(heavy * 1.6);
      card(v, hx, hy + (1 - heavy) * 40, hw, hh, { r: 7, lift: 1.2 });
      rr(ctx, hx + 7, hy + 7 + (1 - heavy) * 40, hw - 14, 16, 3);
      ctx.fillStyle = mix(c.red, c.paper, 0.35);
      ctx.fill();
      textLine(v, hx + 7, hy + 28 + (1 - heavy) * 40, 44);
      textLine(v, hx + 7, hy + 35 + (1 - heavy) * 40, 34);
      ctx.restore();
      ctx.restore();
    },
  },

  /** 06 · Momentum and friction: a carousel is flicked, glides, and settles the red card in its slot. */
  momentum: {
    period: 3.4,
    draw(v, t) {
      const { c, w, h, ctx } = v;
      const cw = 34, ch = 30, gap = 10, n = 7, y = h / 2 - ch / 2 + 2, target = 4;
      const slot = w / 2 - cw / 2;
      const settled = slot - target * (cw + gap) - 8;
      let off = settled, cursorX = -40, press = 0, cursorAlpha = 0;
      if (t !== null) {
        const grab = seg(t, 0.04, 0.16);
        const glide = seg(t, 0.16, 0.7);
        const start = 8, dragged = start - 24;
        const decay = (1 - Math.exp(-4.5 * glide)) / (1 - Math.exp(-4.5));
        off = t < 0.16 ? lerp(start, dragged, easeInOut(grab)) : lerp(dragged, settled, decay);
        if (t > 0.82) off = lerp(settled, start, easeInOut(seg(t, 0.82, 0.97)));
        cursorAlpha = t < 0.24 ? 1 - seg(t, 0.18, 0.24) : 0;
        press = t > 0.05 && t < 0.16 ? 1 : 0;
        cursorX = lerp(120, 96, easeInOut(grab)) - seg(t, 0.16, 0.24) * 16;
      }
      // The snap slot
      ctx.save();
      ctx.setLineDash([2.5, 2]);
      ctx.strokeStyle = c.blue;
      ctx.globalAlpha = 0.8;
      rr(ctx, slot - 3.5, y - 3.5, cw + 7, ch + 7, 7);
      ctx.stroke();
      ctx.restore();
      // The strip, clipped to its window
      ctx.save();
      rr(ctx, 8, 2, w - 16, h - 4, 6);
      ctx.clip();
      for (let i = 0; i < n; i++) {
        const x = off + 8 + i * (cw + gap);
        card(v, x, y, cw, ch, { r: 5, lift: 0.5 });
        rr(ctx, x + 4, y + 4, cw - 8, 12, 2.5);
        ctx.fillStyle = i === target ? c.red : mix(c.blue, c.paper, 0.7);
        ctx.fill();
        textLine(v, x + 4, y + 20, cw - 12, { h: 2.5 });
      }
      ctx.restore();
      // Soft fades at the window's edges
      for (const [x0, x1] of [[8, 24], [w - 8, w - 24]]) {
        const g = ctx.createLinearGradient(x0, 0, x1, 0);
        g.addColorStop(0, c.paper);
        g.addColorStop(1, c.dark ? "rgba(14,15,17,0)" : "rgba(245,243,238,0)");
        ctx.fillStyle = g;
        ctx.fillRect(Math.min(x0, x1), 0, 16, h);
      }
      if (cursorAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = cursorAlpha;
        cursor(v, cursorX, y + ch / 2, press);
        ctx.restore();
      }
    },
  },

  /** 07 · The twelve, translated: a button squashes before it acts (anticipation), then its actions fan out, each a little behind (follow-through). */
  twelve: {
    period: 3,
    draw(v, t) {
      const { c, w, h, ctx } = v;
      const fx = w / 2 + 26, fy = h - 17, R = 9;
      let squash = 0, turn = 1, fan = 1;
      const s = springCurve(0.35, 0.35);
      if (t !== null) {
        squash = Math.sin(seg(t, 0.08, 0.18) * Math.PI);
        turn = t < 0.16 ? 0 : s.at((t - 0.16) * 3) * (1 - easeIn(seg(t, 0.82, 0.9)));
        fan = t < 0.18 ? 0 : 1;
      }
      // Actions: three chips along an arc, each released a beat after the last
      [0, 1, 2].forEach((i) => {
        let p = 1;
        if (t !== null) {
          p = fan ? s.at(Math.max(0, t - 0.18 - i * 0.05) * 3) : 0;
          p *= 1 - easeIn(seg(t, 0.8 - i * 0.02, 0.88 - i * 0.02));
        }
        if (p <= 0.001) return;
        const a = Math.PI * (1.05 + i * 0.22);
        const d = 30 * p;
        const x = fx + Math.cos(a) * d * 1.5;
        const y = fy + Math.sin(a) * d * 0.9;
        ctx.save();
        ctx.globalAlpha = clamp01(p * 2);
        ctx.translate(x, y);
        ctx.scale(lerp(0.5, 1, p), lerp(0.5, 1, p));
        ctx.shadowColor = c.dark ? "rgba(0,0,0,0.55)" : "rgba(20,20,30,0.2)";
        ctx.shadowBlur = 5;
        ctx.shadowOffsetY = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, TAU);
        ctx.fillStyle = c.raised;
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.strokeStyle = c.rule;
        ctx.stroke();
        textLine(v, -3.5, -1, 7, { h: 2.5, color: c.blue });
        ctx.restore();
      });
      // The button: squash on the press, then the plus turns to a cross
      ctx.save();
      ctx.translate(fx, fy + R);
      ctx.scale(1 + squash * 0.14, 1 - squash * 0.16);
      ctx.translate(0, -R);
      ctx.shadowColor = c.dark ? "rgba(0,0,0,0.6)" : "rgba(20,20,30,0.28)";
      ctx.shadowBlur = 7;
      ctx.shadowOffsetY = 3;
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, TAU);
      ctx.fillStyle = c.red;
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.rotate((turn * 45 * Math.PI) / 180);
      line(v, -4, 0, 4, 0, "#ffffff", { width: 1.8 });
      line(v, 0, -4, 0, 4, "#ffffff", { width: 1.8 });
      ctx.restore();
    },
  },

  /** 08 · Stagger and hierarchy: a list arrives in reading order: the heading leads, the rows follow. */
  stagger: {
    period: 3,
    draw(v, t) {
      const { c, w, h, ctx } = v;
      const W = 116, x = (w - W) / 2, y = 3;
      card(v, x, y, W, h - 6, { r: 7, lift: 0.8 });
      const at = (i: number) => (t === null ? 1 : easeOut(seg(t, 0.08 + i * 0.07, 0.3 + i * 0.07)) * (1 - seg(t, 0.88, 0.95)));
      // Heading leads
      const hp = at(0);
      textLine(v, x + 8, y + 7 + (1 - hp) * 5, 46, { h: 4.5, alpha: hp, color: c.dark ? "rgba(236,234,228,0.6)" : "rgba(22,22,26,0.62)" });
      // Rows follow, one beat apart
      for (let i = 0; i < 4; i++) {
        const p = at(i + 1);
        if (p <= 0) continue;
        const ry = y + 17 + i * 10 + (1 - p) * 6;
        ctx.save();
        ctx.globalAlpha = p;
        ctx.beginPath();
        ctx.arc(x + 11, ry + 3, 3.2, 0, TAU);
        ctx.fillStyle = i === 0 ? c.red : mix(c.blue, c.paper, 0.55);
        ctx.fill();
        ctx.restore();
        textLine(v, x + 18, ry + 1.5, [58, 46, 64, 40][i], { alpha: p });
      }
    },
  },

  /** 18 · Organic motion: a collaborator's cursor wanders the page on smooth noise, the way a hand drifts. */
  organic: {
    period: 6,
    draw(v, t) {
      const { c, w, h, ctx } = v;
      const W = 124, x0 = (w - W) / 2, y0 = 4;
      card(v, x0, y0, W, h - 8, { r: 6, lift: 0.6 });
      textLine(v, x0 + 8, y0 + 8, 50, { h: 4 });
      textLine(v, x0 + 8, y0 + 18, 96);
      textLine(v, x0 + 8, y0 + 25, 84);
      textLine(v, x0 + 8, y0 + 32, 90);
      textLine(v, x0 + 8, y0 + 39, 60);
      // Smooth randomness: a sum of slow sines at unrelated rates (no two loops alike to the eye)
      const at = (u: number) => ({
        x: x0 + 62 + Math.sin(u * TAU * 1 + 0.4) * 30 + Math.sin(u * TAU * 3 + 1.9) * 9,
        y: y0 + 26 + Math.sin(u * TAU * 2 + 2.3) * 10 + Math.cos(u * TAU * 5 + 0.7) * 3,
      });
      const tt = t ?? 0.18;
      // Its path so far, in blue pencil
      ctx.save();
      ctx.setLineDash([1.5, 2.5]);
      ctx.strokeStyle = c.blue;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      for (let k = 0; k <= 24; k++) {
        const q = at(tt - (24 - k) * 0.006);
        k ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
      }
      ctx.stroke();
      ctx.restore();
      const q = at(tt);
      // A red presence cursor with its name tag
      ctx.save();
      ctx.translate(q.x, q.y);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 10);
      ctx.lineTo(3, 7.5);
      ctx.lineTo(7.5, 7.5);
      ctx.closePath();
      ctx.fillStyle = c.red;
      ctx.fill();
      rr(ctx, 6, 9, 24, 8, 4);
      ctx.fill();
      textLine(v, 10, 12, 14, { h: 2, color: "rgba(255,255,255,0.85)" });
      ctx.restore();
    },
  },

  /** 19 · Choosing the medium: a segmented control switches one card between CSS, SVG and canvas pixels. */
  medium: {
    period: 4.2,
    draw(v, t) {
      const { c, w, h, ctx } = v;
      // Which medium, and the indicator between them
      const tt = t ?? 0;
      const pos = tt < 0.3 ? 0 : tt < 0.36 ? easeInOut(seg(tt, 0.3, 0.36)) : tt < 0.63 ? 1 : tt < 0.69 ? 1 + easeInOut(seg(tt, 0.63, 0.69)) : tt < 0.94 ? 2 : 2 - 2 * easeInOut(seg(tt, 0.94, 1));
      const sw = 26, sx = w / 2 - (3 * sw) / 2, sy = 4;
      rr(ctx, sx, sy, 3 * sw, 13, 6.5);
      ctx.fillStyle = c.dark ? "rgba(236,234,228,0.08)" : "rgba(22,22,26,0.06)";
      ctx.fill();
      card(v, sx + 1 + pos * sw, sy + 1, sw - 2, 11, { r: 5.5, lift: 0.4 });
      // Tiny glyphs: a box (CSS), a curve (SVG), a pixel grid (canvas)
      rr(ctx, sx + sw / 2 - 3, sy + 4, 6, 5, 1);
      ctx.strokeStyle = c.graphite;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sx + sw * 1.5 - 4, sy + 9);
      ctx.bezierCurveTo(sx + sw * 1.5 - 2, sy + 2, sx + sw * 1.5 + 2, sy + 11, sx + sw * 1.5 + 4, sy + 4);
      ctx.stroke();
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = c.graphite;
        ctx.fillRect(sx + sw * 2.5 - 3 + (i % 2) * 3.5, sy + 3.5 + Math.floor(i / 2) * 3.5, 2.5, 2.5);
      }
      // The same card, rendered by whichever medium is chosen (cross-fading as it switches)
      const cw = 60, ch = 32, cx = w / 2 - cw / 2, cy = 24;
      const weight = (m: number) => clamp01(1 - Math.abs(pos - m));
      const css = weight(0), svg = weight(1), pix = weight(2);
      if (css > 0) {
        ctx.save();
        ctx.globalAlpha = css;
        card(v, cx, cy, cw, ch, { r: 6, lift: 0.8 });
        ctx.beginPath();
        ctx.arc(cx + 11, cy + ch / 2, 5, 0, TAU);
        ctx.fillStyle = c.red;
        ctx.fill();
        textLine(v, cx + 21, cy + 11, 30, { h: 3.5 });
        textLine(v, cx + 21, cy + 18, 22);
        ctx.restore();
      }
      if (svg > 0) {
        ctx.save();
        ctx.globalAlpha = svg;
        rr(ctx, cx + 0.5, cy + 0.5, cw - 1, ch - 1, 6);
        ctx.strokeStyle = c.blue;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + 11, cy + ch / 2, 5, 0, TAU);
        ctx.strokeStyle = c.red;
        ctx.stroke();
        for (const [px, py] of [[cx, cy], [cx + cw, cy], [cx, cy + ch], [cx + cw, cy + ch]]) {
          ctx.fillStyle = c.paper;
          ctx.fillRect(px - 2, py - 2, 4, 4);
          ctx.strokeStyle = c.blue;
          ctx.strokeRect(px - 2 + 0.5, py - 2 + 0.5, 3, 3);
        }
        line(v, cx + 21, cy + 12.5, cx + 51, cy + 12.5, c.blue, { alpha: 0.7 });
        line(v, cx + 21, cy + 19.5, cx + 43, cy + 19.5, c.blue, { alpha: 0.7 });
        ctx.restore();
      }
      if (pix > 0) {
        ctx.save();
        ctx.globalAlpha = pix;
        const p = 4;
        for (let gx = 0; gx < cw; gx += p) {
          for (let gy = 0; gy < ch; gy += p) {
            const dot = Math.hypot(gx + p / 2 - 11, gy + p / 2 - ch / 2) < 6;
            const text = gy >= 8 && gy < 14 && gx >= 20 && gx < 52;
            ctx.fillStyle = dot ? c.red : text ? (c.dark ? "rgba(236,234,228,0.35)" : "rgba(22,22,26,0.3)") : c.dark ? "rgba(236,234,228,0.1)" : "rgba(22,22,26,0.07)";
            ctx.fillRect(cx + gx + 0.5, cy + gy + 0.5, p - 1, p - 1);
          }
        }
        ctx.restore();
      }
    },
  },

  /** 14 · The loop: the same move drawn at 60 and at 12 frames a second. One glides, one steps; both
   *  arrive together, because each frame moves by the time that passed. Only dt survives. */
  loop: {
    period: 2.8,
    draw(v, t) {
      const { c, w, h, ctx } = v;
      const x0 = 52, x1 = w - 18;
      const rows = [
        { fps: 60, y: 22, label: "60 fps" },
        { fps: 12, y: 44, label: "12 fps" },
      ];
      const T = 2.8, a = 0.08, b = 0.76;
      const progress = (sec: number) => easeInOut(seg(sec / T, a, b));
      rows.forEach((r) => {
        // The time this row last drew a frame: now, rounded down to its frame interval.
        const sec = t === null ? 1.07 : t * T; // at rest: mid-move, just before the slow row's next frame
        const drawn = Math.floor(sec * r.fps) / r.fps;
        const p = progress(drawn);
        ctx.save();
        ctx.font = "500 8px 'Geist Mono Variable', ui-monospace, monospace";
        ctx.fillStyle = c.graphite;
        ctx.textBaseline = "middle";
        ctx.fillText(r.label, 12, r.y);
        ctx.restore();
        rr(ctx, x0, r.y - 2.5, x1 - x0, 5, 2.5);
        ctx.fillStyle = c.dark ? "rgba(236,234,228,0.12)" : "rgba(22,22,26,0.08)";
        ctx.fill();
        rr(ctx, x0, r.y - 2.5, Math.max(5, (x1 - x0) * p), 5, 2.5);
        ctx.fillStyle = c.blue;
        ctx.fill();
        // Onion skin: the frames the slow row actually drew, fading behind its knob. At 60 they would
        // blur into the fill, which is the point.
        if (r.fps < 30) {
          const last = Math.round(drawn * r.fps);
          for (let back = 3; back >= 1; back--) {
            const fp = progress((last - back) / r.fps);
            if (fp <= 0 || fp >= 1 || fp >= p) continue;
            ctx.save();
            ctx.globalAlpha = 0.62 - back * 0.16;
            ctx.beginPath();
            ctx.arc(x0 + (x1 - x0) * fp, r.y, 4.5, 0, TAU);
            ctx.fillStyle = c.raised;
            ctx.fill();
            ctx.strokeStyle = c.dark ? "rgba(236,234,228,0.35)" : "rgba(22,22,26,0.18)";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
          }
        }
        const kx = x0 + (x1 - x0) * p;
        ctx.save();
        ctx.shadowColor = c.dark ? "rgba(0,0,0,0.6)" : "rgba(20,20,30,0.22)";
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 1;
        ctx.beginPath();
        ctx.arc(kx, r.y, 5, 0, TAU);
        ctx.fillStyle = c.raised;
        ctx.fill();
        ctx.restore();
        if (c.dark) {
          // On a dark ground the raised knob needs its edge drawn
          ctx.beginPath();
          ctx.arc(kx, r.y, 5, 0, TAU);
          ctx.strokeStyle = "rgba(236,234,228,0.28)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(kx, r.y, 2.2, 0, TAU);
        ctx.fillStyle = c.red;
        ctx.fill();
      });
      // The finish line both reach at the same moment
      line(v, x1, 12, x1, h - 10, c.red, { dash: [2, 2], alpha: 0.6 });
    },
  },

  /** 16 · Physics by hand: a lanyard badge. Tugged aside and let go, it swings as a damped pendulum. */
  "physics-hand": {
    period: 3.4,
    draw(v, t) {
      const { c, w, ctx } = v;
      const ax = w / 2, ay = -4, L = 20, cw = 30, ch = 36;
      // Angle: pulled out by the cursor, then released into a damped swing (integrated by hand).
      let theta = 0, cursorAlpha = 0, pull = 0;
      if (t !== null) {
        pull = easeInOut(seg(t, 0.08, 0.28));
        const theta0 = 0.55;
        if (t < 0.3) theta = theta0 * pull;
        else {
          // semi-implicit Euler: ω += (−g/L·sin θ − c·ω)·dt; θ += ω·dt
          const steps = Math.floor((t - 0.3) * 3.4 * 120);
          let th = theta0, om = 0;
          const dt = 1 / 120, k = 42, damp = 2.2;
          for (let i = 0; i < steps; i++) {
            om += (-k * Math.sin(th) - damp * om) * dt;
            th += om * dt;
          }
          theta = th;
        }
        cursorAlpha = t < 0.3 ? seg(t, 0.03, 0.08) : 1 - seg(t, 0.3, 0.36);
      }
      ctx.save();
      ctx.translate(ax, ay);
      ctx.rotate(-theta);
      // The strap: two sides meeting at the clip
      ctx.strokeStyle = c.red;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-9, 0);
      ctx.quadraticCurveTo(-5, L * 0.6, -1.5, L);
      ctx.moveTo(9, 0);
      ctx.quadraticCurveTo(5, L * 0.6, 1.5, L);
      ctx.stroke();
      // Clip
      rr(ctx, -4, L - 1, 8, 5, 1.5);
      ctx.fillStyle = c.graphite;
      ctx.fill();
      // The badge
      const by = L + 3;
      card(v, -cw / 2, by, cw, ch, { r: 4, lift: 0.9 });
      rr(ctx, -cw / 2 + 0.5, by + 0.5, cw - 1, 8, 3.5);
      ctx.fillStyle = mix(c.red, c.paper, 0.2);
      ctx.fill();
      rr(ctx, -4, by + 2.5, 8, 2, 1);
      ctx.fillStyle = c.paper;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, by + 17, 5, 0, TAU);
      ctx.fillStyle = mix(c.blue, c.paper, 0.55);
      ctx.fill();
      textLine(v, -9, by + 25, 18, { h: 2.6, color: c.dark ? "rgba(236,234,228,0.5)" : "rgba(22,22,26,0.5)" });
      textLine(v, -7, by + 30, 14, { h: 2 });
      ctx.restore();
      // The hand that tugged it: at the badge's lower corner while pulling
      if (cursorAlpha > 0) {
        const bx = ax + Math.sin(theta) * (L + 3 + ch - 4) + 8, byy = ay + Math.cos(theta) * (L + 3 + ch - 4);
        ctx.save();
        ctx.globalAlpha = cursorAlpha;
        cursor(v, bx, byy - 6, t !== null && t < 0.3 ? 1 : 0);
        ctx.restore();
      }
    },
  },

  /** 17 · Many things: press Publish and confetti bursts out: each piece on its own throw, spin and fall. */
  many: {
    period: 3,
    draw(v, t) {
      const { c, w, h, ctx } = v;
      const bx = w / 2, by = h - 14, bw = 50, bh = 15;
      const burstAt = 0.16;
      const press = t === null ? 0 : Math.sin(seg(t, 0.09, 0.17) * Math.PI);
      // Confetti: a seeded throw each, then gravity and air drag (closed form)
      const tau = t === null ? 0.6 : (t - burstAt) * 3;
      if (tau > 0) {
        const N = 28;
        const colors = [c.red, c.blue, c.graphite, mix(c.blue, c.paper, 0.4), c.red];
        const k = 3, g = 60; // strong air drag and light gravity: a fast bloom, then a slow drift down
        const e = 1 - Math.exp(-k * tau);
        const alpha = 1 - clamp01((tau - 1.4) / 0.6);
        for (let i = 0; i < N; i++) {
          // Each piece's own numbers, fixed by its index, so every loop throws the same burst
          const r = (n: number) => {
            const x = Math.sin(i * 127.1 + n * 311.7) * 43758.5453;
            return x - Math.floor(x);
          };
          // A fan spread evenly left to right, each throw jittered off its slot
          const ang = -Math.PI / 2 + ((i + 0.5) / N - 0.5) * 2.5 + (r(1) - 0.5) * 0.18;
          const sp = 50 + r(2) * 120; // a wide range of throws fills the fan instead of drawing a ring
          const vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp;
          const x = bx + (vx / k) * e;
          // v' = g − k·v  ⇒  y = y0 + (g/k)·τ + ((v0 − g/k)/k)·(1 − e^(−kτ))
          const y = by - 4 + (g / k) * tau + ((vy - g / k) / k) * e;
          if (alpha <= 0 || y > h + 4) continue;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(x, y);
          ctx.rotate(r(3) * TAU + tau * (r(4) * 10 - 5));
          ctx.fillStyle = colors[i % colors.length];
          if (i % 3 === 0) {
            ctx.beginPath();
            ctx.arc(0, 0, 1.6, 0, TAU);
            ctx.fill();
          } else {
            ctx.scale(1, Math.cos(tau * 9 + i)); // a flat piece, flipping as it spins
            ctx.fillRect(-1.3, -3, 2.6, 6);
          }
          ctx.restore();
        }
      }
      // The button
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(1 - press * 0.06, 1 - press * 0.06);
      ctx.shadowColor = c.dark ? "rgba(0,0,0,0.55)" : "rgba(200,40,20,0.3)";
      ctx.shadowBlur = 6 - press * 4;
      ctx.shadowOffsetY = 2 - press;
      rr(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2);
      ctx.fillStyle = c.red;
      ctx.fill();
      ctx.shadowColor = "transparent";
      textLine(v, -13, -1.5, 26, { h: 3, color: "rgba(255,255,255,0.85)" });
      ctx.restore();
      if (t !== null) {
        const alpha = seg(t, 0.02, 0.07) * (1 - seg(t, 0.3, 0.38));
        if (alpha > 0) {
          ctx.save();
          ctx.globalAlpha = alpha;
          cursor(v, bx + 10, by + 1, press);
          ctx.restore();
        }
      }
    },
  },

};
