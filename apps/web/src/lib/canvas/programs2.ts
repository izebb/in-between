/**
 * Canvas programs for Part VII (The Canvas): the loop, easing and physics by hand,
 * many things, organic motion. Same contract as programs.ts.
 */
import type { ProgramDef } from "./programs";

const loopHz = `// The same motion at 30, 60 and 120Hz. Each row redraws at its own rate.
// Blue: moves 3px per frame. Red: moves 180px per second × dt.
const LOOP = 3;
const RATES = [30, 60, 120];

function setup(w, h) {
  return { rows: RATES.map((hz) => ({ hz, acc: 0, perFrame: 0, perSecond: 0, ticks: [] })), t: 0 };
}

function update(s, dt) {
  s.t += dt;
  for (const r of s.rows) {
    r.acc += dt;
    const step = 1 / r.hz;
    while (r.acc >= step) {             // this row's own frames
      r.acc -= step;
      r.perFrame += 3;                  // frame-based: speed depends on the refresh rate
      r.perSecond += 180 * step;        // time-based: speed is the same everywhere
      r.ticks.push(r.perSecond);
    }
  }
}

function draw(ctx, s, w, h) {
  ctx.clearRect(0, 0, w, h);
  const x0 = 56, end = w - 16;
  // On a narrow screen the whole plate shrinks, so the red dot's 3 seconds still fit the track.
  const k = Math.min(1, (end - x0) / (180 * LOOP));
  const words = params.labels === 0;    // before a chapter's FEEL: words, no numbers
  const two = w < 460;                  // too narrow for the legend on one line
  s.rows.forEach((r, i) => {
    const y = 34 + i * ((h - (two ? 52 : 40)) / 3);
    label(ctx, words ? ["slow", "middle", "fast"][i] : r.hz + "Hz", 12, y + 4, pencils.ink);
    segment(ctx, x0, y + 12, w - 12, y + 12, pencils.rule);
    for (let j = 0; j < r.ticks.length; j += 1) {
      const x = x0 + r.ticks[j] * k;
      if (x < w - 12) segment(ctx, x, y + 9, x, y + 15, pencils.graphite);
    }
    circle(ctx, Math.min(x0 + r.perFrame * k, end), y - 4, 6, pencils.blue);
    circle(ctx, Math.min(x0 + r.perSecond * k, end), y + 12, 7, pencils.red);
  });
  const blue = words ? "blue: a step per frame" : "blue: 3px per frame";
  const red = words ? "red: a speed × time" : "red: 180px per second × dt";
  if (two) {
    label(ctx, blue, w - 12, h - 18, pencils.graphite, "right");
    label(ctx, red, w - 12, h - 6, pencils.graphite, "right");
  } else label(ctx, blue + "   " + red, w - 12, h - 6, pencils.graphite, "right");
}
`;

const smoothingTrap = `// Chasing a target: x += (target − x) · k, at three refresh rates.
// Blue: k = 0.1 per frame (the trap). Red: 1 − e^(−λ·dt) per second (the fix).
const LOOP = 4;
const RATES = [30, 60, 120];
const LAMBDA = -Math.log(1 - 0.1) * 60;   // matches k = 0.1 at 60fps

function setup(w, h) {
  return { w, clock: 0, rows: RATES.map((hz) => ({ hz, acc: 0, naive: 64, fixed: 64 })) };
}

function update(s, dt) {
  s.clock += dt;
  // Two seconds out, two seconds back: every dot is home again when the pass starts over.
  const target = s.clock % LOOP < LOOP / 2 ? s.w - 40 : 64;
  for (const r of s.rows) {
    r.acc += dt;
    const step = 1 / r.hz;
    while (r.acc >= step) {
      r.acc -= step;
      r.naive += (target - r.naive) * 0.1;                        // per frame
      r.fixed += (target - r.fixed) * (1 - Math.exp(-LAMBDA * step)); // per second
    }
  }
}

function draw(ctx, s, w, h) {
  ctx.clearRect(0, 0, w, h);
  const words = params.labels === 0;    // before a chapter's FEEL: words, no numbers
  const two = w < 460;                  // too narrow for the legend on one line
  s.rows.forEach((r, i) => {
    const y = 34 + i * ((h - (two ? 52 : 40)) / 3);
    label(ctx, words ? ["slow", "middle", "fast"][i] : r.hz + "Hz", 12, y + 4, pencils.ink);
    segment(ctx, 56, y + 12, w - 20, y + 12, pencils.rule);
    circle(ctx, r.naive, y - 4, 6, pencils.blue);
    circle(ctx, r.fixed, y + 12, 7, pencils.red);
  });
  const blue = words ? "blue: a share per frame" : "blue: k per frame";
  const red = words ? "red: a share per second" : "red: λ per second";
  if (two) {
    label(ctx, blue, w - 12, h - 18, pencils.graphite, "right");
    label(ctx, red, w - 12, h - 6, pencils.graphite, "right");
  } else label(ctx, blue + "   " + red, w - 12, h - 6, pencils.graphite, "right");
}
`;

const integrators = `// One spring, three integrators, the same large step (dt = params.step seconds).
// Explicit Euler gains energy and explodes; semi-implicit Euler and Verlet stay bounded.
const LOOP = 6;
const K = 60, C = 0;                        // stiffness, no damping: energy should stay constant

function setup(w, h) {
  const x0 = 1;
  return {
    acc: 0, t: 0,
    euler: { x: x0, v: 0 }, semi: { x: x0, v: 0 }, verlet: { x: x0, prev: x0 },
    hist: [],
  };
}

function a(x, v) { return -K * x - C * v; }

function update(s, dt) {
  s.acc += dt;
  const h = params.step;
  while (s.acc >= h) {
    s.acc -= h; s.t += h;
    const e = s.euler; const ax = a(e.x, e.v);
    e.x += e.v * h; e.v += ax * h;                         // position with the old velocity
    const m = s.semi;
    m.v += a(m.x, m.v) * h; m.x += m.v * h;                // velocity first, then position
    const vb = s.verlet; const next = 2 * vb.x - vb.prev + a(vb.x, 0) * h * h;
    vb.prev = vb.x; vb.x = next;                           // position only
    s.hist.push([e.x, m.x, vb.x, s.t]);
  }
}

function draw(ctx, s, w, h) {
  ctx.clearRect(0, 0, w, h);
  const names = ["explicit Euler", "semi-implicit Euler", "Verlet"];
  const rowH = (h - 20) / 3;
  const LIMIT = 3;                                        // the row holds ±3× the starting height
  names.forEach((n, i) => {
    const top = 10 + rowH * i;
    label(ctx, n.toUpperCase(), 12, top + 10);
    const mid = top + 14 + (rowH - 14) / 2;              // below the label
    const scale = ((rowH - 14) / 2 - 3) / LIMIT;
    segment(ctx, 12, mid, w - 12, mid, pencils.rule);
    ctx.beginPath();
    let px = 12, py = 0;
    for (let j = 0; j < s.hist.length; j++) {
      const p = s.hist[j], x = 12 + (p[3] / LOOP) * (w - 24);
      if (Math.abs(p[i]) > LIMIT) {                      // runs off its row: draw to the edge, then stop
        const edge = Math.sign(p[i]) * LIMIT, f = (edge - py) / (p[i] - py);
        ctx.lineTo(px + (x - px) * f, mid - edge * scale);
        break;
      }
      ctx.lineTo(x, mid - p[i] * scale);
      px = x; py = p[i];
    }
    ctx.strokeStyle = i === 0 ? pencils.red : pencils.ink;
    ctx.lineWidth = 1.2; ctx.stroke();
  });
}
`;

const collisions = `// Gravity, walls, restitution and friction. Tap to drop a ball.
const LOOP = 8;

function setup(w, h) {
  rand = seeded(9);
  const balls = [];
  for (let i = 0; i < 6; i++) balls.push({ x: w * (0.1 + i * 0.16), y: 30 + rand() * 40, vx: random(-120, 120), vy: 0, r: 8 + rand() * 8 });
  return { balls, w, h };
}

function update(s, dt) {
  for (const b of s.balls) {
    b.vy += params.gravity * dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    // Friction is a rate per second, so the ball slides the same distance at any step size.
    if (b.y > s.h - b.r) { b.y = s.h - b.r; b.vy *= -params.bounce; b.vx *= Math.exp(-params.friction * dt); }
    if (b.x < b.r) { b.x = b.r; b.vx *= -params.bounce; }
    if (b.x > s.w - b.r) { b.x = s.w - b.r; b.vx *= -params.bounce; }
  }
}

function onPointer(s, p, type) {
  if (type === "down") s.balls.push({ x: p.x, y: p.y, vx: random(-80, 80), vy: 0, r: 8 + random(0, 8) });
  if (s.balls.length > 40) s.balls.shift();
}

function draw(ctx, s, w, h) {
  ctx.clearRect(0, 0, w, h);
  segment(ctx, 0, h - 0.5, w, h - 0.5, pencils.graphite);
  for (const b of s.balls) circle(ctx, b.x, b.y, b.r, pencils.red);
}
`;

const particles = `// Particles: emit, live, die. Each one is just position, velocity and age.
const LOOP = 6;

function setup(w, h) {
  rand = seeded(4);
  return { list: [], carry: 0, x: w / 2, y: h * 0.7 };
}

function update(s, dt) {
  if (pointer.down) { s.x = pointer.x; s.y = pointer.y; }
  s.carry += params.rate * dt;                     // emit
  while (s.carry >= 1) {
    s.carry -= 1;
    const a = -Math.PI / 2 + random(-0.6, 0.6), sp = random(80, 220);
    s.list.push({ x: s.x, y: s.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, age: 0 });
  }
  for (const p of s.list) {                        // live
    p.vy += params.gravity * dt;
    p.x += p.vx * dt; p.y += p.vy * dt; p.age += dt;
  }
  s.list = s.list.filter((p) => p.age < params.life); // die
}

function draw(ctx, s, w, h) {
  ctx.clearRect(0, 0, w, h);
  for (const p of s.list) {
    const k = p.age / params.life;
    ctx.globalAlpha = 1 - k;
    circle(ctx, p.x, p.y, 3 * (1 - k) + 1, k < 0.15 ? pencils.red : pencils.ink);
  }
  ctx.globalAlpha = 1;
  if (params.labels !== 0) label(ctx, s.list.length + " alive · press and drag to move the emitter", 12, h - 8);
}
`;

const trails = `// Motion trails from translucent clears: instead of erasing the whole frame,
// erase only a share of it, so old frames fade slowly.
const LOOP = 6;

function setup(w, h) {
  return { t: 0, w, h, first: true, since: 0 };
}

function update(s, dt) { s.t += dt; s.since += dt; }

function draw(ctx, s, w, h) {
  if (params.fade >= 1 || s.first) { ctx.clearRect(0, 0, w, h); s.first = false; }
  else {
    // The fade is set per 60th of a second, and scaled by the time since the last paint,
    // so the tails are the same length on a 60Hz and a 120Hz screen.
    const a = 1 - Math.pow(1 - params.fade, s.since * 60);
    ctx.globalCompositeOperation = "destination-out";   // erase a little of everything
    ctx.fillStyle = "rgba(0,0,0," + a + ")";
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = "source-over";
  }
  for (let i = 0; i < 3; i++) {
    const a = s.t * (1.2 + i * 0.5) + i * 2;
    const x = w / 2 + Math.cos(a) * (w * 0.32 - i * 30);
    const y = h / 2 + Math.sin(a * 1.3) * (h * 0.32 - i * 10);
    circle(ctx, x, y, 7, i === 0 ? pencils.red : pencils.ink);
  }
  s.since = 0;
}
`;

const boids = `// Boids (Reynolds, 1986): three local rules, no leader.
// Separation: don't crowd. Alignment: steer with neighbours. Cohesion: stay together.
const LOOP = 12;
const N = 70, SEE = 46, MIN = 45, MAX = 120;   // sight radius px, speed limits px/s

function setup(w, h) {
  rand = seeded(2);
  const list = [];
  for (let i = 0; i < N; i++) list.push({ x: random(0, w), y: random(0, h), vx: random(-60, 60), vy: random(-60, 60) });
  return { list, w, h };
}

function update(s, dt) {
  for (const b of s.list) {
    let cx = 0, cy = 0, ax = 0, ay = 0, sx = 0, sy = 0, n = 0;
    for (const o of s.list) {
      if (o === b) continue;
      const dx = o.x - b.x, dy = o.y - b.y, d2 = dx * dx + dy * dy;
      if (d2 > SEE * SEE) continue;
      n++; cx += o.x; cy += o.y; ax += o.vx; ay += o.vy;
      if (d2 < 18 * 18) { sx -= dx; sy -= dy; }
    }
    if (n) {
      b.vx += ((cx / n - b.x) * params.cohesion + (ax / n - b.vx) * params.alignment + sx * params.separation) * dt;
      b.vy += ((cy / n - b.y) * params.cohesion + (ay / n - b.vy) * params.alignment + sy * params.separation) * dt;
    }
    const sp = Math.hypot(b.vx, b.vy);                 // a bird can't hover: keep the speed in range
    const k = sp > MAX ? MAX / sp : sp < MIN && sp > 0 ? MIN / sp : 1;
    b.vx *= k; b.vy *= k;
    b.x = (b.x + b.vx * dt + s.w) % s.w;
    b.y = (b.y + b.vy * dt + s.h) % s.h;
  }
}

function draw(ctx, s, w, h) {
  ctx.clearRect(0, 0, w, h);
  for (const b of s.list) {
    const a = Math.atan2(b.vy, b.vx);
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
    ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, 4); ctx.lineTo(-5, -4); ctx.closePath();
    ctx.fillStyle = pencils.ink; ctx.fill(); ctx.restore();
  }
  const b = s.list[0];
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx));
  ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, 5); ctx.lineTo(-6, -5); ctx.closePath();
  ctx.fillStyle = pencils.red; ctx.fill(); ctx.restore();
  circle(ctx, b.x, b.y, SEE, null, pencils.blue);
}
`;

const noiseVsRandom = `// Random jumps; noise drifts. Both wanderers use the same range.
const LOOP = 6;

function setup(w, h) {
  rand = seeded(6);
  return { along: 0, r: { x: w * 0.25, y: h / 2 }, histR: [], histN: [], w, h };
}

function update(s, dt) {
  s.along += params.speed * dt;                              // walk along the noise: t · speed
  s.r.x = s.w * 0.25 + random(-1, 1) * s.w * 0.18;          // a new random value every frame
  s.r.y = s.h / 2 + random(-1, 1) * s.h * 0.32;
  const nx = s.w * 0.75 + noise2(s.along, 0) * s.w * 0.18;    // neighbouring moments agree
  const ny = s.h / 2 + noise2(0, s.along + 10) * s.h * 0.32;
  s.histR.push([s.r.x, s.r.y]); s.histN.push([nx, ny]);
  if (s.histR.length > 60) { s.histR.shift(); s.histN.shift(); }
}

function trail(ctx, hist, color) {
  ctx.beginPath();
  hist.forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke();
}

function draw(ctx, s, w, h) {
  ctx.clearRect(0, 0, w, h);
  segment(ctx, w / 2, 10, w / 2, h - 10, pencils.rule);
  label(ctx, "RANDOM", 12, 16); label(ctx, "NOISE", w / 2 + 12, 16);
  trail(ctx, s.histR, pencils.blue); trail(ctx, s.histN, pencils.blue);
  const [rx, ry] = s.histR[s.histR.length - 1] || [0, 0];
  const [nx, ny] = s.histN[s.histN.length - 1] || [0, 0];
  circle(ctx, rx, ry, 8, pencils.red); circle(ctx, nx, ny, 8, pencils.red);
}
`;

const idle = `// Idle motion that never loops obviously: slow noise on scale, sway and tilt.
const LOOP = 120;

function setup(w, h) { return { t: 0 }; }

function update(s, dt) { s.t += dt * params.speed; }   // speed runs the clock faster or slower

function draw(ctx, s, w, h) {
  ctx.clearRect(0, 0, w, h);
  const t = s.t;
  const items = [
    { x: w * 0.22, name: "sine only", breathe: 1 + 0.04 * Math.sin(t * 2), sway: 0, tilt: 0 },
    { x: w * 0.5, name: "sines, uneven", breathe: 1 + 0.03 * Math.sin(t * 1.7) + 0.015 * Math.sin(t * 2.9 + 1), sway: 4 * Math.sin(t * 0.9), tilt: 0.03 * Math.sin(t * 1.3) },
    { x: w * 0.78, name: "noise", breathe: 1 + 0.045 * noise1(t * 0.6), sway: 8 * noise1(t * 0.35 + 20), tilt: 0.06 * noise1(t * 0.5 + 40) },
  ];
  const r = Math.min(34, w * 0.1);                 // smaller on a narrow screen, so they never touch
  for (const it of items) {
    ctx.save();
    ctx.translate(it.x + it.sway, h / 2);
    ctx.rotate(it.tilt);
    ctx.scale(it.breathe, it.breathe);
    ctx.beginPath(); ctx.ellipse(0, 0, r, r * 0.88, 0, 0, TAU);
    ctx.fillStyle = pencils.red; ctx.fill();
    ctx.restore();
    label(ctx, it.name.toUpperCase(), it.x, h - 12, pencils.graphite, "center");
  }
}
`;

export const programs2: Record<string, ProgramDef> = {
  "loop-hz": { id: "loop-hz", title: "The same motion at 30, 60 and 120Hz", source: loopHz, loop: 3, height: 220, ghostEvery: 40 },
  "smoothing-trap": { id: "smoothing-trap", title: "The smoothing trap", source: smoothingTrap, loop: 4, height: 220, ghostEvery: 20 },
  integrators: {
    id: "integrators",
    title: "Euler, semi-implicit Euler, Verlet",
    source: integrators,
    loop: 6,
    height: 280,
    ghostEvery: 400,
    params: [{ key: "step", label: "Time step", value: 1 / 30, options: [{ value: 1 / 120, label: "1/120 s" }, { value: 1 / 60, label: "1/60 s" }, { value: 1 / 30, label: "1/30 s" }, { value: 1 / 15, label: "1/15 s" }] }],
  },
  collisions: {
    id: "collisions",
    title: "Gravity and collisions",
    source: collisions,
    loop: 8,
    height: 260,
    ghostEvery: 8,
    params: [
      { key: "gravity", label: "Gravity", value: 1200, min: 0, max: 3000, step: 50, unit: "px/s²" },
      { key: "bounce", label: "Restitution", value: 0.7, min: 0, max: 0.98, step: 0.01 },
      { key: "friction", label: "Floor friction", value: 2.5, min: 0, max: 12, step: 0.1, unit: "/s" },
    ],
  },
  particles: {
    id: "particles",
    title: "Particles",
    source: particles,
    loop: 6,
    height: 260,
    ghostEvery: 12,
    params: [
      { key: "rate", label: "Emit rate", value: 90, min: 5, max: 400, step: 5, unit: "/s" },
      { key: "life", label: "Life", value: 1.4, min: 0.2, max: 4, step: 0.1, unit: "s" },
      { key: "gravity", label: "Gravity", value: 260, min: -200, max: 1200, step: 10, unit: "px/s²" },
    ],
  },
  trails: {
    id: "trails",
    title: "Trails from translucent clears",
    source: trails,
    loop: 6,
    height: 240,
    ghostEvery: 1000,
    params: [{ key: "fade", label: "Clear opacity", value: 0.12, min: 0.02, max: 1, step: 0.01 }],
  },
  boids: {
    id: "boids",
    title: "Boids",
    source: boids,
    loop: 12,
    height: 300,
    ghostEvery: 1000,
    params: [
      { key: "separation", label: "Separation", value: 6, min: 0, max: 20, step: 0.5 },
      { key: "alignment", label: "Alignment", value: 1.2, min: 0, max: 5, step: 0.1 },
      { key: "cohesion", label: "Cohesion", value: 0.6, min: 0, max: 3, step: 0.05 },
    ],
  },
  "noise-vs-random": {
    id: "noise-vs-random",
    title: "Random vs noise",
    source: noiseVsRandom,
    loop: 6,
    height: 240,
    ghostEvery: 1000,
    params: [{ key: "speed", label: "Noise speed", value: 0.6, min: 0.1, max: 3, step: 0.05 }],
  },
  idle: {
    id: "idle",
    title: "Idle motion",
    source: idle,
    loop: 120,
    height: 200,
    ghostEvery: 400,
    params: [{ key: "speed", label: "Speed", value: 1, min: 0.2, max: 3, step: 0.05 }],
  },
};
