/**
 * Canvas programs used by chapter figures. Each is plain JS source with
 * setup(w, h) → state, update(state, dt), draw(ctx, state, w, h), optional onPointer.
 * The same source opens in the Canvas sandbox (L7), so readers can edit what they just watched.
 * Globals: params, pointer, pencils, and the helpers in prelude.ts.
 */

export interface ProgramParam {
  key: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: { value: number; label: string }[];
}

export interface ProgramDef {
  id: string;
  title: string;
  source: string;
  params?: ProgramParam[];
  height?: number;
  /** Seconds per pass (the program may also set LOOP). */
  loop?: number;
  ghostEvery?: number;
}

const bouncingBall = `// A ball under gravity. Each bounce keeps a fraction of its speed.
const LOOP = 4;

function setup(w, h) {
  return { x: 36, y: 36, vx: (w - 90) / 3, vy: 0, floor: h - 28, wall: w - 24, squash: 0, trail: [] };
}

function update(s, dt) {
  s.vy += params.gravity * dt;        // gravity: speed grows every frame
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  if (s.y > s.floor) {                // contact: bounce back, losing energy
    s.y = s.floor;
    s.squash = Math.min(1, s.vy / 800);   // the harder it lands, the more it squashes
    s.vy = -s.vy * params.bounce;
    if (s.vy > -40) s.vy = 0;         // too slow to leave the floor: now it rolls
  }
  if (s.y === s.floor) s.vx *= Math.exp(-2 * dt);   // rolling, it slows to a stop
  if (s.x < 24 || s.x > s.wall) {     // the walls at either end
    s.x = clamp(s.x, 24, s.wall);
    s.vx = -s.vx * params.bounce;
  }
  s.squash = Math.max(0, s.squash - dt * 9);
  s.trail.push([s.x, s.y]);
}

function draw(ctx, s, w, h) {
  ctx.clearRect(0, 0, w, h);
  segment(ctx, 16, s.floor + 12, w - 16, s.floor + 12, pencils.graphite);
  for (let i = 0; i < s.trail.length; i += 4) {
    const [x, y] = s.trail[i];
    circle(ctx, x, y, 11, null, pencils.blue);
  }
  const sq = params.squash ? s.squash * 0.35 : 0;
  ctx.save();
  ctx.translate(s.x, s.y + 12 * (1 - 1 / (1 + sq)));   // the bottom stays on the floor
  ctx.scale(1 + sq, 1 / (1 + sq));    // flatter and wider, the same amount of ball
  circle(ctx, 0, 0, 12, pencils.red);
  ctx.restore();
}
`;

const heavyLight = `// The same arc, two weights. Only timing and spacing change.
const LOOP = 2.6;
const heavyEase = cubicBezier(0.3, 0.1, 0.7, 0.9);   // barely slows at the top
const lightEase = cubicBezier(0.2, 0.7, 0.8, 0.3);   // hangs at the top: floaty

function setup(w, h) {
  return { t: 0 };
}

function update(s, dt) {
  s.t += dt;
}

function point(w, h, row, u) {
  const top = row === 0 ? 30 : h / 2 + 34;
  const base = row === 0 ? h / 2 - 22 : h - 22;
  const x = 40 + (w - 80) * u;
  const y = base - (base - top) * 4 * u * (1 - u);
  return [x, y];
}

function progress(t, dur, ease) {
  return ease(clamp(t / dur));
}

function draw(ctx, s, w, h) {
  ctx.clearRect(0, 0, w, h);
  const rows = [
    { name: "heavy", dur: 0.7, ease: heavyEase },
    { name: "light", dur: 1.3, ease: lightEase },
  ];
  rows.forEach((r, i) => {
    const [bx, by] = point(w, h, i, 1);
    segment(ctx, 20, by + 14, w - 20, by + 14, pencils.graphite);
    label(ctx, r.name.toUpperCase(), 20, (i === 0 ? 14 : h / 2 + 18));
    for (let f = 0; f <= r.dur * 30; f++) {           // every other frame at 60fps
      const [x, y] = point(w, h, i, progress(f / 30, r.dur, r.ease));
      circle(ctx, x, y, 9, null, pencils.blue);
    }
    const [x, y] = point(w, h, i, progress(Math.min(s.t, r.dur), r.dur, r.ease));
    circle(ctx, x, y, 10, pencils.red);
  });
}
`;

const interrupt = `// Retarget mid-flight. A tween restarts; a spring keeps its velocity.
// Tap the canvas to move the target yourself.
const LOOP = 6;
const K = 120, C = 16;                // spring stiffness and damping
const TWEEN = 0.6;                    // tween duration, seconds
const ease = cubicBezier(0.65, 0, 0.35, 1);
// When the target jumps (seconds), and where to (0 = left end, 1 = right end).
// Most jumps come mid-flight; the last one brings both dots home to rest.
const JUMPS = [[0, 1], [0.38, 0.3], [1.45, 0.8], [1.75, 1], [2.85, 0.1], [3.15, 0.6], [3.45, 0.2], [4.5, 0]];

function setup(w, h) {
  const a = 60, b = w - 60;
  const s = { a, b, target: a, clock: 0, jump: 0, quiet: 0,
    tween: { x: a, from: a, t: 1, v: 0 }, spring: { x: a, v: 0 }, vt: [], vs: [] };
  // Play one pass unseen first, so the velocity lines start full and the loop has no seam.
  for (let i = 0; i < LOOP * 60; i++) update(s, 1 / 60);
  return Object.assign(s, { clock: 0, jump: 0 });
}

function retarget(s, x) {
  s.target = x;
  s.tween.from = s.tween.x;           // the tween starts over from where it is...
  s.tween.t = 0;                      // ...with zero speed: a visible kink
}

function update(s, dt) {
  s.clock += dt;
  while (s.jump < JUMPS.length && JUMPS[s.jump][0] <= s.clock) {
    const to = JUMPS[s.jump++][1];
    if (s.clock > s.quiet) retarget(s, lerp(s.a, s.b, to));
  }
  const tw = s.tween;
  const px = tw.x;
  tw.t = Math.min(1, tw.t + dt / TWEEN);
  tw.x = lerp(tw.from, s.target, ease(tw.t));
  tw.v = (tw.x - px) / dt;
  const sp = s.spring;                // the spring integrates toward the target
  sp.v += (-K * (sp.x - s.target) - C * sp.v) * dt;
  sp.x += sp.v * dt;
  s.vt.push(tw.v); s.vs.push(sp.v);   // keep one pass of velocity (at 60Hz)
  while (s.vt.length > LOOP * 60) { s.vt.shift(); s.vs.shift(); }
}

function onPointer(s, p, type) {
  if (type === "down") { retarget(s, clamp(p.x, s.a, s.b)); s.quiet = s.clock + 2; }
}

function row(ctx, s, y, x, vel, name, w) {
  label(ctx, name, 20, y - 26);
  segment(ctx, s.a, y, s.b, y, pencils.rule);
  circle(ctx, s.target, y, 7, null, pencils.blue);
  circle(ctx, x, y, 10, pencils.red);
  if (pencils.ghost) return;          // a still draws the velocity once, on its last frame
  const base = y + 44, sc = 5 / (s.b - s.a);   // a full trip at top speed is about 24px tall
  segment(ctx, 20, base, w - 20, base, pencils.rule);
  ctx.beginPath();
  vel.forEach((v, i) => ctx.lineTo(20 + (i / (vel.length - 1)) * (w - 40), base - clamp(v * sc, -26, 26)));
  ctx.strokeStyle = pencils.ink; ctx.lineWidth = 1.2; ctx.stroke();
  label(ctx, "velocity", w - 20, base + 12, pencils.graphite, "right");
}

function draw(ctx, s, w, h) {
  ctx.clearRect(0, 0, w, h);
  row(ctx, s, 40, s.tween.x, s.vt, "TWEEN · RESTARTS", w);
  row(ctx, s, h / 2 + 40, s.spring.x, s.vs, "SPRING · KEEPS VELOCITY", w);
}
`;

const flick = `// Flick the puck. On release it keeps its velocity and loses a fixed
// fraction every millisecond (friction). Where it will stop is known at once.
const LOOP = 8;
const HOME = 60;

function setup(w, h) {
  return { x: HOME, v: 0, y: h / 2, min: 30, max: w - 30, drag: false, grab: 0, landing: null, still: 0, clock: 0 };
}

function lambda() { return -Math.log(params.rate) * 1000; }   // per second

function release(s, v) {
  s.v = v;
  s.landing = clamp(s.x + v / lambda(), s.min, s.max);        // x₀ + v₀ / λ
}

function update(s, dt) {
  s.clock += dt;
  if (s.drag) return;
  const k = Math.exp(-lambda() * dt);                         // v(t) = v₀·e^(−λt)
  s.x += (s.v / lambda()) * (1 - k);                          // exact distance this step
  s.v *= k;
  if (s.x < s.min || s.x > s.max) { s.x = clamp(s.x, s.min, s.max); s.v = 0; }
  // Nobody throwing? The figure throws for itself: out, then home, done by the end of the pass.
  s.still = Math.abs(s.v) < 5 ? s.still + dt : 0;
  if (s.still > 0.5) {
    if (s.x > HOME + 0.5) release(s, (HOME - s.x) * lambda());   // the speed that stops at home
    else if (s.clock < LOOP - 3) release(s, 1.4 * (s.max - HOME)); // the same hand every time
  }
}

function onPointer(s, p, type) {
  if (type === "down" && Math.abs(p.x - s.x) < 40) Object.assign(s, { drag: true, grab: p.x - s.x, landing: null, v: 0 });
  if (type === "move" && s.drag) s.x = clamp(p.x - s.grab, s.min, s.max);
  if (type === "up" && s.drag) { s.drag = false; release(s, p.vx); s.still = -2.5; }
}

function draw(ctx, s, w, h) {
  ctx.clearRect(0, 0, w, h);
  segment(ctx, s.min, s.y, s.max, s.y, pencils.graphite);
  if (s.landing != null) {
    circle(ctx, s.landing, s.y, 16, null, pencils.blue);
    segment(ctx, s.landing, s.y - 26, s.landing, s.y - 18, pencils.blue);
    label(ctx, "lands here", s.landing, s.y - 32, pencils.blue, "center");
  }
  circle(ctx, s.x, s.y, 14, pencils.red);
  label(ctx, "speed " + Math.round(Math.abs(s.v)) + " px/s", 20, h - 14);
  label(ctx, params.rate === 0.998 ? "rate 0.998 · normal" : "rate 0.99 · fast", w - 20, h - 14, pencils.graphite, "right");
}
`;

const springMass = `// A mass on a spring, integrated by hand (semi-implicit Euler).
// Drag the mass down and let go.
const LOOP = 5;
const PULL = 50;                       // each pass, a hand pulls it this far down

function setup(w, h) {
  const rest = h * 0.62;
  const s = { y: rest, v: 0, rest, low: h - 20, t: 0, drag: false, trace: [] };
  for (let i = 0; i < LOOP * 60; i++) update(s, 1 / 60);   // play one pass unseen: the trace starts full
  return Object.assign(s, { y: rest, v: 0, t: 0 });
}

function update(s, dt) {
  s.t += dt;
  if (s.t < 0.6 && !s.drag) {          // the hand pulls it down...
    s.y = s.rest + PULL * Math.sin((s.t / 0.6) * Math.PI / 2) ** 2;
  } else if (!s.drag) {                // ...and lets go
    const force = -params.k * (s.y - s.rest) - params.c * s.v;
    s.v += (force / params.m) * dt;    // velocity first,
    s.y += s.v * dt;                   // then position
  }
  s.trace.push(s.y);                   // keep one pass (at 60Hz)
  while (s.trace.length > LOOP * 60) s.trace.shift();
}

function onPointer(s, p, type) {
  if (type === "down" && Math.abs(p.y - s.y) < 40 && p.x < 180) Object.assign(s, { drag: true, v: 0, t: Math.max(s.t, 0.6) });
  if (type === "move" && s.drag) s.y = clamp(p.y, 40, s.low);
  if (type === "up") s.drag = false;
}

function draw(ctx, s, w, h) {
  ctx.clearRect(0, 0, w, h);
  const x = 90;
  segment(ctx, x - 30, 12, x + 30, 12, pencils.graphite, 1.5);
  ctx.beginPath();                     // the coil
  const turns = 12;
  for (let i = 0; i <= turns * 2; i++) {
    const yy = 12 + ((s.y - 16 - 12) * i) / (turns * 2);
    ctx.lineTo(x + (i % 2 ? 9 : -9) * (i && i < turns * 2 ? 1 : 0), yy);
  }
  ctx.strokeStyle = pencils.graphite; ctx.lineWidth = 1; ctx.stroke();
  segment(ctx, 40, s.rest, 140, s.rest, pencils.rule);
  label(ctx, "rest", 40, s.rest - 4);
  ctx.fillStyle = pencils.red;
  ctx.fillRect(x - 16, s.y - 16, 32, 32);
  if (pencils.ghost) return;           // a still draws the trace once, on its last frame
  const left = 200;                    // position over time, newest on the right
  segment(ctx, left, s.rest, w - 16, s.rest, pencils.rule);
  ctx.beginPath();
  s.trace.forEach((y, i) => ctx.lineTo(left + (i / (s.trace.length - 1)) * (w - 16 - left), y));
  ctx.strokeStyle = pencils.ink; ctx.lineWidth = 1.3; ctx.stroke();
  label(ctx, "position over time →", w - 16, h - 8, pencils.graphite, "right");
}
`;

import { programs2 } from "./programs2";

export const programs: Record<string, ProgramDef> = {
  "bouncing-ball": {
    id: "bouncing-ball",
    title: "Bouncing ball",
    source: bouncingBall,
    loop: 4,
    height: 240,
    ghostEvery: 5,
    params: [
      { key: "gravity", label: "Gravity", value: 1400, min: 200, max: 3000, step: 50, unit: "px/s²" },
      { key: "bounce", label: "Restitution", value: 0.62, min: 0, max: 0.95, step: 0.01 },
      { key: "squash", label: "Squash on contact", value: 1, options: [{ value: 0, label: "Off" }, { value: 1, label: "On" }] },
    ],
  },
  "heavy-light": { id: "heavy-light", title: "Heavy and light on the same arc", source: heavyLight, loop: 2.6, height: 280, ghostEvery: 100 },
  interrupt: { id: "interrupt", title: "Interrupting a tween and a spring", source: interrupt, loop: 6, height: 250, ghostEvery: 12 },
  flick: {
    id: "flick",
    title: "Flick with friction",
    source: flick,
    loop: 8,
    height: 170,
    ghostEvery: 10,
    params: [{ key: "rate", label: "Deceleration rate", value: 0.998, options: [{ value: 0.998, label: "Normal · 0.998" }, { value: 0.99, label: "Fast · 0.99" }] }],
  },
  "spring-mass": {
    id: "spring-mass",
    title: "Mass on a spring",
    source: springMass,
    loop: 5,
    height: 280,
    ghostEvery: 8,
    params: [
      { key: "k", label: "Stiffness k", value: 120, min: 10, max: 600, step: 5 },
      { key: "c", label: "Damping c", value: 4, min: 0, max: 40, step: 0.5 },
      { key: "m", label: "Mass m", value: 1, min: 0.2, max: 5, step: 0.1 },
    ],
  },
  ...programs2,
};
