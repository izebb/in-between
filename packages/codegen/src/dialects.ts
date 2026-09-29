/**
 * One motion, five notations. Every generator prints the same bound numbers,
 * so switching tabs is a change of notation, not of meaning.
 */

import {
  effectiveDuration,
  formatLinear,
  springToLinear,
  type EasingSpec,
  type LinearStop,
  type Move,
  type Property,
  type StepPosition,
} from "@inbetween/core";
import { Writer, fmt, type Code, type Dialect } from "./writer.ts";
import type { Scene } from "./scene.ts";

// ---------------------------------------------------------------- helpers

const valueDecimals = (p: Property) => (p === "scale" || p === "opacity" ? 3 : 1);
const unit = (p: Property) => (p === "x" || p === "y" ? "px" : p === "rotate" ? "deg" : "");
/** "start" and "end" are CSS's aliases for jump-start and jump-end. */
const stepPos = (p: StepPosition) => (p === "start" ? "jump-start" : p === "end" ? "jump-end" : p);

/** CSS steps() for the JS dialects that don't have it. */
const stepsHelper = (note = "") => `
// CSS steps(n, position): hold, then jump.${note}
function steps(n, position = 'jump-end') {
  const jumps = position === 'jump-none' ? n - 1 : position === 'jump-both' ? n + 1 : n;
  const lead = position === 'jump-start' || position === 'jump-both' ? 1 : 0;
  return (t) => Math.min(Math.floor(t * n) + lead, jumps) / jumps;
}
`;

/** CSS linear() for the JS dialects: straight lines through the same stops. */
const LINEAR_HELPER = `
// CSS linear(): straight lines through [time, progress] stops.
function linearEase(stops) {
  return (t) => {
    if (t <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
      const [t1, p1] = stops[i];
      if (t < t1) {
        const [t0, p0] = stops[i - 1];
        return p0 + ((p1 - p0) * (t - t0)) / (t1 - t0);
      }
    }
    return stops[stops.length - 1][1];
  };
}
`;

const linearStopsJs = (stops: LinearStop[]) =>
  `linearEase([${stops.map((s) => `[${fmt(s.input, 4)}, ${fmt(s.output, 4)}]`).join(", ")}])`;

/** A spring's starting velocity is stored per whole distance; libraries want units per second. */
const velocityScale = (m: Move) => m.to - m.from;

/** A JS identifier for a target class name: "card-2" → "card2". */
export function ident(target: string): string {
  const s = target.replace(/[^a-zA-Z0-9_$]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : ""));
  return /^[a-zA-Z_$]/.test(s) ? s : `el${s}`;
}

function groupByTarget(moves: Move[]): Map<string, { move: Move; i: number }[]> {
  const m = new Map<string, { move: Move; i: number }[]>();
  moves.forEach((move, i) => {
    const list = m.get(move.target) ?? [];
    list.push({ move, i });
    m.set(move.target, list);
  });
  return m;
}

/**
 * How a property is written in CSS for this target. One transform → classic `transform`.
 * Several → individual properties (translate / scale / rotate) so each can have its own timing.
 */
type CssMode = "transform" | "individual";
function cssModeFor(list: { move: Move }[]): CssMode {
  return list.filter((l) => l.move.property !== "opacity").length > 1 ? "individual" : "transform";
}

function cssPropName(p: Property, mode: CssMode, hasX: boolean): string {
  if (p === "opacity") return "opacity";
  if (mode === "transform") return "transform";
  if (p === "x") return "translate";
  if (p === "y") return hasX ? "transform" : "translate";
  return p; // scale, rotate
}

/** Print a property value: translateX(240px), scale(0.8), 0.5 … with the number bound. */
function writeValue(w: Writer, p: Property, mode: CssMode, hasX: boolean, path: string, v: number) {
  const d = valueDecimals(p);
  const u = unit(p);
  const name = cssPropName(p, mode, hasX);
  if (name === "opacity" || name === "scale") return w.n(path, v, { decimals: d });
  if (name === "rotate") return w.n(path, v, { decimals: d }).t(u);
  if (name === "translate") return p === "y" ? w.t("0 ").n(path, v, { decimals: d }).t(u) : w.n(path, v, { decimals: d }).t(u);
  // transform: translateX(…)
  const fn = p === "x" ? "translateX" : p === "y" ? "translateY" : p === "scale" ? "scale" : "rotate";
  return w.t(`${fn}(`).n(path, v, { decimals: d }).t(`${u})`);
}

function springComment(e: Extract<EasingSpec, { type: "spring" }>, i: number, w: Writer, open: string, close: string) {
  w.t(`${open}spring: stiffness `)
    .n(`${i}.easing.stiffness`, e.stiffness, { decimals: 1 })
    .t(", damping ")
    .n(`${i}.easing.damping`, e.damping, { decimals: 2 })
    .t(", mass ")
    .n(`${i}.easing.mass`, e.mass, { decimals: 2 })
    .t(close);
}

/** The CSS <easing-function> for a move, with its numbers bound. */
function writeCssEasing(w: Writer, e: EasingSpec, i: number) {
  switch (e.type) {
    case "cubic":
      w.t("cubic-bezier(")
        .n(`${i}.easing.x1`, e.x1, { decimals: 3 })
        .t(", ")
        .n(`${i}.easing.y1`, e.y1, { decimals: 3 })
        .t(", ")
        .n(`${i}.easing.x2`, e.x2, { decimals: 3 })
        .t(", ")
        .n(`${i}.easing.y2`, e.y2, { decimals: 3 })
        .t(")");
      return;
    case "spring":
      w.tag(`${i}.easing`).t(springToLinear(e, { velocity: e.velocity }).easing);
      return;
    case "steps":
      w.t("steps(").n(`${i}.easing.steps`, e.steps).t(`, ${e.position})`);
      return;
    case "points":
      w.tag(`${i}.easing`).t(formatLinear(e.stops));
      return;
    default:
      w.tag(`${i}.easing`).t("linear");
  }
}

/** Duration printed in a unit (ms or s). Springs derive theirs: printed, not bound. */
function writeDuration(w: Writer, m: Move, i: number, seconds: boolean) {
  if (m.easing.type === "spring") {
    const d = effectiveDuration(m.easing, m.duration);
    w.tag(`${i}.easing`).t(seconds ? fmt(d / 1000, 3) : String(d));
    return;
  }
  w.n(`${i}.duration`, m.duration, seconds ? { scale: 0.001, decimals: 3 } : {});
}

const needsDelay = (scene: Scene) => scene.moves.length > 1 || scene.moves.some((m) => m.delay !== 0);

// ---------------------------------------------------------------- CSS

export function css(scene: Scene): Code {
  const w = new Writer();
  if (scene.title) w.t(`/* ${scene.title} */\n`);
  const showDelay = needsDelay(scene);
  const groups = [...groupByTarget(scene.moves)];
  groups.forEach(([target, list], gi) => {
    const mode = cssModeFor(list);
    const hasX = list.some((l) => l.move.property === "x");
    for (const { move, i } of list) {
      if (move.easing.type === "spring") {
        springComment(move.easing, i, w, "/* ", " */");
        w.t("\n");
      }
    }
    w.t(`.${target} {`).tag(...list.map((l) => String(l.i)));
    // Start values. With `transform` mode there is at most one transform move.
    for (const { move, i } of list) {
      const name = cssPropName(move.property, mode, hasX);
      w.t(`\n  ${name}: `);
      writeValue(w, move.property, mode, hasX, `${i}.from`, move.from);
      w.t(";");
    }
    // Transition list
    const entries = list.map(({ move, i }) => ({ move, i, name: cssPropName(move.property, mode, hasX) }));
    if (entries.length === 1) {
      const { move, i, name } = entries[0];
      w.t(`\n  transition: ${name} `);
      writeDuration(w, move, i, false);
      w.t("ms ");
      writeCssEasing(w, move.easing, i);
      if (showDelay) w.t(" ").n(`${i}.delay`, move.delay).t("ms");
      w.t(";");
    } else {
      w.t("\n  transition:");
      entries.forEach(({ move, i, name }, k) => {
        w.t(`\n    ${name} `);
        writeDuration(w, move, i, false);
        w.t("ms ");
        writeCssEasing(w, move.easing, i);
        if (showDelay) w.t(" ").n(`${i}.delay`, move.delay).t("ms");
        w.t(k === entries.length - 1 ? ";" : ",");
      });
    }
    w.t("\n}\n\n");
    w.t(`.is-on .${target} {`).tag(...list.map((l) => String(l.i)));
    for (const { move, i } of list) {
      const name = cssPropName(move.property, mode, hasX);
      w.t(`\n  ${name}: `);
      writeValue(w, move.property, mode, hasX, `${i}.to`, move.to);
      w.t(";");
    }
    w.t("\n}");
    if (gi < groups.length - 1) w.t("\n\n");
  });
  w.t("\n");
  return w.done("css", "css");
}

// ---------------------------------------------------------------- WAAPI

function jsKeyframeProp(p: Property, mode: CssMode, hasX: boolean): string {
  return cssPropName(p, mode, hasX);
}

export function waapi(scene: Scene): Code {
  const w = new Writer();
  if (scene.title) w.t(`// ${scene.title}\n`);
  const groups = [...groupByTarget(scene.moves)];
  for (const [target] of groups) w.t(`const ${ident(target)} = document.querySelector('.${target}');\n`);
  const showDelay = needsDelay(scene);
  for (const [target, list] of groups) {
    const mode = cssModeFor(list);
    const hasX = list.some((l) => l.move.property === "x");
    for (const { move, i } of list) {
      const prop = jsKeyframeProp(move.property, mode, hasX);
      w.t("\n");
      if (move.easing.type === "spring") {
        springComment(move.easing, i, w, "// ", ", as linear()");
        w.t("\n");
      }
      w.t(`${ident(target)}.animate(`).tag(String(i));
      w.t(`\n  [{ ${prop}: '`);
      writeValue(w, move.property, mode, hasX, `${i}.from`, move.from);
      w.t(`' }, { ${prop}: '`);
      writeValue(w, move.property, mode, hasX, `${i}.to`, move.to);
      w.t("' }],");
      w.t("\n  {\n    duration: ");
      writeDuration(w, move, i, false);
      w.t(",");
      if (showDelay) w.t("\n    delay: ").n(`${i}.delay`, move.delay).t(",");
      w.t("\n    easing: '");
      writeCssEasing(w, move.easing, i);
      w.t("',\n    fill: 'both',\n  },\n);");
      w.t("\n");
    }
  }
  return w.done("waapi", "javascript");
}

// ---------------------------------------------------------------- Motion (motion.dev)

const motionProp = (p: Property) => p; // x, y, scale, opacity, rotate

export function motion(scene: Scene): Code {
  const w = new Writer();
  if (scene.title) w.t(`// ${scene.title}\n`);
  const stepMoves = scene.moves.flatMap((m) => (m.easing.type === "steps" ? [m.easing] : []));
  // Motion's steps() knows 'start' and 'end'; jump-none and jump-both need CSS's own rule.
  const ownSteps = stepMoves.some((e) => ["jump-none", "jump-both"].includes(stepPos(e.position)));
  const usesPoints = scene.moves.some((m) => m.easing.type === "points");
  w.t(`import { animate${stepMoves.length && !ownSteps ? ", steps" : ""} } from 'motion';\n`);
  const showDelay = needsDelay(scene);
  scene.moves.forEach((move, i) => {
    const d = valueDecimals(move.property);
    w.t("\n");
    w.t(`animate('.${move.target}', { ${motionProp(move.property)}: [`).tag(String(i));
    w.n(`${i}.from`, move.from, { decimals: d }).t(", ").n(`${i}.to`, move.to, { decimals: d }).t("] }, {");
    const e = move.easing;
    if (e.type === "spring") {
      w.t("\n  type: 'spring',");
      w.t("\n  stiffness: ").n(`${i}.easing.stiffness`, e.stiffness, { decimals: 1 }).t(",");
      w.t("\n  damping: ").n(`${i}.easing.damping`, e.damping, { decimals: 2 }).t(",");
      w.t("\n  mass: ").n(`${i}.easing.mass`, e.mass, { decimals: 2 }).t(",");
      // Motion reads velocity in the value's own units per second.
      if (e.velocity && velocityScale(move)) w.t("\n  velocity: ").n(`${i}.easing.velocity`, e.velocity, { scale: velocityScale(move), decimals: d }).t(",");
    } else {
      w.t("\n  duration: ").n(`${i}.duration`, move.duration, { scale: 0.001, decimals: 3 }).t(",");
      w.t("\n  ease: ");
      if (e.type === "cubic") {
        w.t("[")
          .n(`${i}.easing.x1`, e.x1, { decimals: 3 })
          .t(", ")
          .n(`${i}.easing.y1`, e.y1, { decimals: 3 })
          .t(", ")
          .n(`${i}.easing.x2`, e.x2, { decimals: 3 })
          .t(", ")
          .n(`${i}.easing.y2`, e.y2, { decimals: 3 })
          .t("]");
      } else if (e.type === "steps") {
        const pos = stepPos(e.position);
        w.t("steps(").n(`${i}.easing.steps`, e.steps).t(ownSteps ? `, '${pos}')` : `, '${pos === "jump-start" ? "start" : "end"}')`);
      } else if (e.type === "points") {
        w.tag(`${i}.easing`).t(linearStopsJs(e.stops));
      } else {
        w.tag(`${i}.easing`).t("'linear'");
      }
      w.t(",");
    }
    if (showDelay) w.t("\n  delay: ").n(`${i}.delay`, move.delay, { scale: 0.001, decimals: 3 }).t(",");
    w.t("\n});\n");
  });
  if (ownSteps) w.t(stepsHelper());
  if (usesPoints) w.t(LINEAR_HELPER);
  return w.done("motion", "javascript");
}

// ---------------------------------------------------------------- GSAP

const gsapProp = (p: Property) => (p === "rotate" ? "rotation" : p);

/** A spring as an ease, solved exactly: the same numbers as the stage's model. */
const springHelper = (lead: string) => `
// ${lead}
// v0 is the starting speed in whole distances per second (0 = from rest).
function springEase(k, c, m, v0 = 0) {
  const w0 = Math.sqrt(k / m), z = c / (2 * Math.sqrt(k * m));
  const pos = (t) => {   // progress at t seconds
    if (Math.abs(z - 1) < 1e-6) return 1 - Math.exp(-w0 * t) * (1 + (w0 - v0) * t);
    if (z < 1) {
      const wd = w0 * Math.sqrt(1 - z * z);
      return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0 - v0) / wd) * Math.sin(wd * t));
    }
    const s = Math.sqrt(z * z - 1), r1 = -w0 * (z - s), r2 = -w0 * (z + s);
    const c2 = (v0 + r1) / (r2 - r1), c1 = -1 - c2;
    return 1 + c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
  };
  let duration = 0;   // until it stays within 0.1% of the target
  for (let t = 0; t < 10; t += 0.001) if (Math.abs(1 - pos(t)) > 0.001) duration = t;
  return { duration, ease: (p) => (p >= 1 ? 1 : pos(p * duration)) };
}
`;

/** springEase(k, c, m[, v0]) with its numbers bound. */
function writeSpringEase(w: Writer, e: Extract<EasingSpec, { type: "spring" }>, i: number) {
  w.t("springEase(")
    .n(`${i}.easing.stiffness`, e.stiffness, { decimals: 1 })
    .t(", ")
    .n(`${i}.easing.damping`, e.damping, { decimals: 2 })
    .t(", ")
    .n(`${i}.easing.mass`, e.mass, { decimals: 2 });
  if (e.velocity) w.t(", ").n(`${i}.easing.velocity`, e.velocity, { decimals: 2 });
  w.t(")");
}

export function gsap(scene: Scene): Code {
  const w = new Writer();
  if (scene.title) w.t(`// ${scene.title}\n`);
  const usesCubic = scene.moves.some((m) => m.easing.type === "cubic");
  const usesSpring = scene.moves.some((m) => m.easing.type === "spring");
  const usesSteps = scene.moves.some((m) => m.easing.type === "steps");
  const usesPoints = scene.moves.some((m) => m.easing.type === "points");
  w.t("import { gsap } from 'gsap';\n");
  if (usesCubic) w.t("import { CustomEase } from 'gsap/CustomEase';\n\ngsap.registerPlugin(CustomEase);\n");
  const showDelay = needsDelay(scene);
  scene.moves.forEach((move, i) => {
    const d = valueDecimals(move.property);
    const prop = gsapProp(move.property);
    const e = move.easing;
    w.t("\n");
    if (e.type === "spring") {
      w.t(`const spring${i || ""} = `);
      writeSpringEase(w, e, i);
      w.t(";\n");
    }
    w.t(`gsap.fromTo('.${move.target}', { ${prop}: `).tag(String(i));
    w.n(`${i}.from`, move.from, { decimals: d }).t(" }, {");
    w.t(`\n  ${prop}: `).n(`${i}.to`, move.to, { decimals: d }).t(",");
    if (e.type === "spring") {
      w.t(`\n  duration: spring${i || ""}.duration,`).tag(`${i}.easing`);
      w.t(`\n  ease: spring${i || ""}.ease,`).tag(`${i}.easing`);
    } else {
      w.t("\n  duration: ").n(`${i}.duration`, move.duration, { scale: 0.001, decimals: 3 }).t(",");
      w.t("\n  ease: ");
      if (e.type === "cubic") {
        w.t(`CustomEase.create('ease${i}', 'M0,0 C`)
          .n(`${i}.easing.x1`, e.x1, { decimals: 3 })
          .t(",")
          .n(`${i}.easing.y1`, e.y1, { decimals: 3 })
          .t(" ")
          .n(`${i}.easing.x2`, e.x2, { decimals: 3 })
          .t(",")
          .n(`${i}.easing.y2`, e.y2, { decimals: 3 })
          .t(" 1,1')");
      } else if (e.type === "steps") {
        w.t("steps(").n(`${i}.easing.steps`, e.steps).t(`, '${stepPos(e.position)}')`);
      } else if (e.type === "points") {
        w.tag(`${i}.easing`).t(linearStopsJs(e.stops));
      } else {
        w.tag(`${i}.easing`).t("'none'");
      }
      w.t(",");
    }
    if (showDelay) w.t("\n  delay: ").n(`${i}.delay`, move.delay, { scale: 0.001, decimals: 3 }).t(",");
    w.t("\n});\n");
  });
  if (usesSpring) w.t(springHelper("GSAP has no spring. This one is solved exactly and played as an ease."));
  if (usesSteps) w.t(stepsHelper("\n// (GSAP's own 'steps(n)' holds n + 1 levels, 0 to 1: not the same curve.)"));
  if (usesPoints) w.t(LINEAR_HELPER);
  return w.done("gsap", "javascript");
}

// ---------------------------------------------------------------- Canvas

const CUBIC_HELPER = `
// cubic-bezier(), solved the way browsers do: find t for x, then read y.
function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t) => ((ax * t + bx) * t + cx) * t;
  const dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    let t = x;
    for (let i = 0; i < 8; i++) {   // Newton: fast while the slope is healthy
      const d = dX(t);
      if (Math.abs(d) < 1e-6) break;
      t -= (X(t) - x) / d;
    }
    if (!(t >= 0 && t <= 1) || Math.abs(X(t) - x) > 1e-7) {
      let lo = 0, hi = 1;   // bisection: slow and certain
      for (let i = 0; i < 40; i++) {
        t = (lo + hi) / 2;
        if (X(t) < x) lo = t;
        else hi = t;
      }
    }
    return ((ay * t + by) * t + cy) * t;
  };
}
`;

const BOX_HELPER = `
function drawBox(ctx, o, x, y) {
  ctx.save();
  ctx.globalAlpha = o.opacity;
  ctx.translate(x + o.x, y + o.y);
  ctx.rotate((o.rotate * Math.PI) / 180);
  ctx.scale(o.scale, o.scale);
  ctx.fillStyle = '#FF3B1F';
  ctx.fillRect(-20, -20, 40, 40);
  ctx.restore();
}
`;

function canvasEase(w: Writer, e: EasingSpec, i: number) {
  switch (e.type) {
    case "cubic":
      w.t("cubicBezier(")
        .n(`${i}.easing.x1`, e.x1, { decimals: 3 })
        .t(", ")
        .n(`${i}.easing.y1`, e.y1, { decimals: 3 })
        .t(", ")
        .n(`${i}.easing.x2`, e.x2, { decimals: 3 })
        .t(", ")
        .n(`${i}.easing.y2`, e.y2, { decimals: 3 })
        .t(")");
      return;
    case "steps":
      w.t("steps(").n(`${i}.easing.steps`, e.steps).t(`, '${stepPos(e.position)}')`);
      return;
    case "spring":
      writeSpringEase(w, e, i);
      return;
    case "points":
      w.tag(`${i}.easing`).t(linearStopsJs(e.stops));
      return;
    default:
      w.tag(`${i}.easing`).t("(t) => t");
  }
}

const initial = (p: Property) => (p === "scale" || p === "opacity" ? 1 : 0);

export function canvas(scene: Scene): Code {
  const w = new Writer();
  if (scene.title) w.t(`// ${scene.title}\n`);
  w.t("// update(dt) moves things; draw(ctx, width, height) paints them. dt is in seconds.\n\n");
  const targets = [...groupByTarget(scene.moves)];
  for (const [target, list] of targets) {
    const init: Record<string, number> = { x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 };
    for (const { move } of list) init[move.property] = move.from;
    w.t(`const ${ident(target)} = { x: ${fmt(init.x, 1)}, y: ${fmt(init.y, 1)}, scale: ${fmt(init.scale, 3)}, opacity: ${fmt(init.opacity, 3)}, rotate: ${fmt(init.rotate, 1)} };\n`).tag(...list.map((l) => String(l.i)));
  }

  const single = scene.moves.length === 1 ? scene.moves[0] : null;
  const usesSpringTable = !single && scene.moves.some((m) => m.easing.type === "spring");
  if (single && single.easing.type === "spring") {
    // The six-line spring: semi-implicit Euler (chapter 16), on a fixed step so it
    // matches the exact solution to a fraction of a percent at any frame rate.
    const e = single.easing;
    const o = ident(single.target);
    const d = valueDecimals(single.property);
    const u = single.property === "x" || single.property === "y" ? "px" : single.property === "rotate" ? "degrees" : "units";
    w.t("\nconst k = ").n("0.easing.stiffness", e.stiffness, { decimals: 1 })
      .t(", c = ").n("0.easing.damping", e.damping, { decimals: 2 })
      .t(", m = ").n("0.easing.mass", e.mass, { decimals: 2 })
      .t(";   // stiffness, damping, mass\n");
    w.t("const target = ").n("0.to", single.to, { decimals: d }).t(";\n");
    if (single.delay) w.t("const delay = ").n("0.delay", single.delay, { scale: 0.001, decimals: 3 }).t(";   // seconds\n");
    w.t("let v = ");
    if (velocityScale(single)) w.n("0.easing.velocity", e.velocity ?? 0, { scale: velocityScale(single), decimals: d });
    else w.tag("0.easing").t("0");
    w.t(`;   // ${u} per second\n`);
    w.t("const STEP = 1 / 1000;   // a fixed step: the same motion at any frame rate\n").tag("0.easing");
    w.t("let time = 0, stepped = 0;   // seconds played, seconds simulated\n");
    w.t("\nfunction update(dt) {\n  time += dt;\n");
    w.t(`  while (stepped + STEP <= time${single.delay ? " - delay" : ""}) {\n    stepped += STEP;\n`);
    w.t(`    const force = -k * (${o}.${single.property} - target) - c * v;\n`).tag("0.easing");
    const vLine = "    v += (force / m) * STEP;";
    const xLine = `    ${o}.${single.property} += v * STEP;`;
    const col = Math.max(vLine.length, xLine.length) + 3;
    w.t(`${vLine.padEnd(col)}// semi-implicit Euler:\n`).tag("0.easing");
    w.t(`${xLine.padEnd(col)}// velocity first, then position\n`).tag("0.easing");
    w.t("  }\n}\n");
  } else if (single) {
    const i = 0;
    const o = ident(single.target);
    const d = valueDecimals(single.property);
    w.t("const from = ").n("0.from", single.from, { decimals: d }).t(", to = ").n("0.to", single.to, { decimals: d }).t(";\n");
    w.t("const duration = ").n("0.duration", single.duration, { scale: 0.001, decimals: 3 }).t(";   // seconds\n");
    if (single.delay) w.t("const delay = ").n("0.delay", single.delay, { scale: 0.001, decimals: 3 }).t(";\n");
    w.t("const ease = ");
    canvasEase(w, single.easing, i);
    w.t(";\nlet time = 0;\n");
    w.t("\nfunction update(dt) {\n  time += dt;\n");
    w.t(`  const t = Math.min(Math.max(${single.delay ? "(time - delay)" : "time"} / duration, 0), 1);\n`).tag("0.duration");
    w.t(`  ${o}.${single.property} = from + (to - from) * ease(t);\n`).tag("0.easing");
    w.t("}\n");
  } else {
    w.t("\nconst tracks = [\n");
    scene.moves.forEach((m, i) => {
      const d = valueDecimals(m.property);
      w.t(`  { of: ${ident(m.target)}, prop: '${m.property}', from: `)
        .n(`${i}.from`, m.from, { decimals: d })
        .t(", to: ")
        .n(`${i}.to`, m.to, { decimals: d })
        .t(", delay: ")
        .n(`${i}.delay`, m.delay, { scale: 0.001, decimals: 3 })
        .t(", duration: ");
      if (m.easing.type === "spring") w.tag(`${i}.easing`).t("null");
      else w.n(`${i}.duration`, m.duration, { scale: 0.001, decimals: 3 });
      w.t(", ease: ");
      canvasEase(w, m.easing, i);
      w.t(" },\n");
    });
    w.t("];\nlet time = 0;\n");
    w.t("\nfunction update(dt) {\n  time += dt;\n  for (const k of tracks) {\n");
    w.t("    const duration = k.duration ?? k.ease.duration;\n");
    w.t("    const t = Math.min(Math.max((time - k.delay) / duration, 0), 1);\n");
    w.t("    k.of[k.prop] = k.from + (k.to - k.from) * (k.ease.ease ?? k.ease)(t);\n");
    w.t("  }\n}\n");
  }

  w.t("\nfunction draw(ctx, width, height) {\n  ctx.clearRect(0, 0, width, height);\n");
  targets.forEach(([target, list], row) => {
    const y = targets.length === 1 ? "height / 2" : `height * ${fmt((row + 1) / (targets.length + 1), 3)}`;
    w.t(`  drawBox(ctx, ${ident(target)}, 60, ${y});\n`).tag(...list.map((l) => String(l.i)));
  });
  w.t("}\n");
  w.t(BOX_HELPER);
  if (scene.moves.some((m) => m.easing.type === "cubic")) w.t(CUBIC_HELPER);
  if (scene.moves.some((m) => m.easing.type === "steps")) w.t(stepsHelper());
  if (scene.moves.some((m) => m.easing.type === "points")) w.t(LINEAR_HELPER);
  if (usesSpringTable) w.t(springHelper("A spring (stiffness, damping, mass), solved exactly, as an ease over its settle time."));
  return w.done("canvas", "javascript");
}

export const DIALECTS: { id: Dialect; label: string; gen: (s: Scene) => Code }[] = [
  { id: "css", label: "CSS", gen: css },
  { id: "waapi", label: "WAAPI", gen: waapi },
  { id: "motion", label: "Motion", gen: motion },
  { id: "gsap", label: "GSAP", gen: gsap },
  { id: "canvas", label: "Canvas", gen: canvas },
];

export function generate(dialect: Dialect, scene: Scene): Code {
  return DIALECTS.find((d) => d.id === dialect)!.gen(scene);
}
