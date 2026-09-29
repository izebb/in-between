/**
 * The helpers every canvas program can use, in the chapters and in the Canvas Sandbox (L7).
 * Plain JS source, evaluated in the program's own scope. Pure maths, no libraries.
 */
export const PRELUDE = `
const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const invLerp = (a, b, v) => (a === b ? 0 : (v - a) / (b - a));
// Frame-rate independent smoothing: x += (target - x) * (1 - e^(-λ·dt))
const damp = (x, target, lambda, dt) => lerp(x, target, 1 - Math.exp(-lambda * dt));
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rand = seeded(7);
const random = (lo = 0, hi = 1) => lo + (hi - lo) * rand();
const noise1 = (() => {
  const r = seeded(11), g = Array.from({ length: 256 }, () => r() * 2 - 1);
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x) => {
    const i = Math.floor(x), f = x - i;
    const a = g[i & 255] * f, b = g[(i + 1) & 255] * (f - 1);
    return (a + (b - a) * fade(f)) * 2;
  };
})();
const noise2 = (() => {
  const r = seeded(13), p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  const perm = [...p, ...p];
  const grad = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
  const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
  const c = (gi, x, y) => { let t = 0.5 - x * x - y * y; if (t < 0) return 0; t *= t; const g = grad[gi % 8]; return t * t * (g[0] * x + g[1] * y); };
  return (xin, yin) => {
    const s = (xin + yin) * F2, i = Math.floor(xin + s), j = Math.floor(yin + s), t = (i + j) * G2;
    const x0 = xin - (i - t), y0 = yin - (j - t), i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    return 70 * (c(perm[ii + perm[jj]], x0, y0) + c(perm[ii + i1 + perm[jj + j1]], x1, y1) + c(perm[ii + 1 + perm[jj + 1]], x2, y2));
  };
})();
function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t) => ((ax * t + bx) * t + cx) * t, dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) { const d = dX(t); if (Math.abs(d) < 1e-6) break; t -= (X(t) - x) / d; }
    t = Math.min(1, Math.max(0, t));
    return ((ay * t + by) * t + cy) * t;
  };
}
function circle(ctx, x, y, r, fill, stroke) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}
function segment(ctx, x1, y1, x2, y2, stroke, width = 1) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke();
}
function label(ctx, text, x, y, color = pencils.graphite, align = "left") {
  if (pencils.ghost) return; // onion-skin stills draw labels once, on the final frame
  ctx.font = "10px ui-monospace, 'JetBrains Mono', monospace";
  ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(text, x, y);
}
`;

/** The names a program's source may define and the runner will pick up. */
export const EXPORTS = `
;return {
  setup: typeof setup === "function" ? setup : null,
  update: typeof update === "function" ? update : null,
  draw: typeof draw === "function" ? draw : null,
  onPointer: typeof onPointer === "function" ? onPointer : null,
  loop: typeof LOOP === "number" ? LOOP : null,
};`;
