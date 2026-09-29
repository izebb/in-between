/**
 * Builds the sandboxed stage: an <iframe srcdoc> document that runs user code under the
 * virtual clock and reports every frame back to the host with postMessage.
 *
 * Protocol (host → frame):   { ib: 1, cmd: "play" | "pause" | "rate" | "step" | "ff" | "code" | "reset", value? }
 * Protocol (frame → host):   { ib: 1, type: "ready" | "frame" | "error" | "log", ... }
 *   frame: { t, s: { [target]: [x, y, scale, opacity, rotate] } }   (x/y = centre, px)
 */

import { installClock } from "./clock";

export type SandboxDialect = "css" | "waapi" | "motion" | "gsap" | "canvas" | "js";

export interface HarnessOptions {
  dialect: SandboxDialect;
  code: string;
  /** Element class names on the stage (DOM dialects) or variable names sampled (canvas). */
  targets: string[];
  /** Pencil colours for the stage objects. */
  colors: { red: string; ink: string; blue: string; graphite: string; paper: string };
  playing?: boolean;
  rate?: number;
  /** Where the objects sit, px from the left. */
  originX?: number;
  /** Canvas: keep state across code reloads (L7 hot reload). */
  hot?: boolean;
}

export const ident = (target: string) => {
  const s = target.replace(/[^a-zA-Z0-9_$]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : ""));
  return /^[a-zA-Z_$]/.test(s) ? s : `el${s}`;
};

/** ES imports → the UMD globals loaded into the frame. */
export function rewriteImports(code: string): string {
  return code.replace(/^\s*import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"];?\s*$/gm, (_, names: string, mod: string) => {
    if (mod === "motion") return `const {${names}} = Motion;`;
    if (mod.startsWith("gsap")) return ""; // gsap and its plugins are globals already
    return `/* unsupported import: ${mod} */`;
  });
}

function runtime(o: HarnessOptions) {
  // Everything inside this function runs in the iframe (serialised with toString()).
  return `
(function () {
  var realRAF = window.requestAnimationFrame.bind(window);
  var SHOULD_PLAY = ${o.playing !== false};
  // Start paused: nothing moves until the page has rendered and t = 0 is measured.
  var clock = (${installClock.toString()})(window, { playing: false, rate: ${o.rate ?? 1} });
  window.__ibClock = clock;
  var TARGETS = ${JSON.stringify(o.targets)};
  var DIALECT = ${JSON.stringify(o.dialect)};
  function post(m) { m.ib = 1; parent.postMessage(m, "*"); }
  window.addEventListener("error", function (e) { post({ type: "error", message: String(e.message || e) }); });
  window.addEventListener("unhandledrejection", function (e) { post({ type: "error", message: String(e.reason && e.reason.message || e.reason) }); });
  ["log", "warn", "error"].forEach(function (k) {
    var orig = console[k];
    console[k] = function () {
      try { post({ type: "log", level: k, text: Array.prototype.map.call(arguments, function (a) { return typeof a === "object" ? JSON.stringify(a) : String(a); }).join(" ") }); } catch (e) {}
      orig.apply(console, arguments);
    };
  });

  var canvasApi = null, canvasState = null, ctx = null, W = 0, H = 0;
  window.__ibCanvas = function (api) { canvasApi = api; };

  function measureDom(name) {
    var el = document.querySelector("." + name);
    if (!el) return null;
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    var m = cs.transform && cs.transform !== "none" ? new DOMMatrix(cs.transform) : new DOMMatrix();
    var sc = Math.sqrt(m.a * m.a + m.b * m.b);
    if (cs.scale && cs.scale !== "none") sc *= parseFloat(cs.scale);
    var rot = Math.atan2(m.b, m.a) * 180 / Math.PI;
    if (cs.rotate && cs.rotate !== "none") rot += parseFloat(cs.rotate);
    return [r.left + r.width / 2, r.top + r.height / 2, sc, parseFloat(cs.opacity), rot];
  }
  function measureCanvas(name) {
    var subj = canvasApi && canvasApi.subjects && canvasApi.subjects[name];
    if (!subj && canvasState && typeof canvasState === "object" && typeof canvasState.x === "number") subj = canvasState;
    if (!subj) return null;
    var baseY = TARGETS.length === 1 ? H / 2 : H * (TARGETS.indexOf(name) + 1) / (TARGETS.length + 1);
    return [${o.originX ?? 60} + (subj.x || 0), baseY + (subj.y || 0), subj.scale == null ? 1 : subj.scale, subj.opacity == null ? 1 : subj.opacity, subj.rotate || 0];
  }
  function sample(t) {
    var s = {};
    for (var i = 0; i < TARGETS.length; i++) {
      var v = DIALECT === "canvas" ? measureCanvas(TARGETS[i]) : measureDom(TARGETS[i]);
      if (v) s[TARGETS[i]] = v.map(function (n) { return Math.round(n * 1000) / 1000; });
    }
    post({ type: "frame", t: t, s: s });
  }

  function sizeCanvas() {
    var cv = document.querySelector("canvas.ib-canvas");
    if (!cv) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  clock.onFrame(function (t, dt) {
    if (DIALECT === "canvas" && canvasApi && ctx) {
      try {
        if (canvasApi.setup && canvasState == null) canvasState = canvasApi.setup(W, H);
        if (canvasApi.update) canvasApi.setup ? canvasApi.update(canvasState, dt / 1000) : canvasApi.update(dt / 1000);
        if (canvasApi.draw) canvasApi.setup ? canvasApi.draw(ctx, canvasState, W, H) : canvasApi.draw(ctx, W, H);
      } catch (e) { post({ type: "error", message: String(e && e.message || e) }); canvasApi = null; }
    }
    sample(t);
  });

  window.addEventListener("message", function (e) {
    var m = e.data;
    if (!m || m.ib !== 1) return;
    if (m.cmd === "play") { userPaused = false; clock.play(); }
    if (m.cmd === "pause") { userPaused = true; clock.pause(); }
    if (m.cmd === "rate") clock.setRate(m.value);
    if (m.cmd === "step") { userPaused = true; clock.step(m.value || 1, m.fps || 60); }
    if (m.cmd === "ff") { userPaused = true; clock.pause(); clock.fastForward(m.value, m.fps || 60); }
    if (m.cmd === "code" && DIALECT === "canvas") { window.__ibLoad(m.value, true); }
    if (m.cmd === "reset" && DIALECT === "canvas") { canvasState = null; }
  });

  var userPaused = false;
  window.__ibStart = function () {
    // Two real frames: the document is laid out and painted before time begins.
    realRAF(function () { realRAF(function () {
      if (DIALECT === "canvas") { sizeCanvas(); window.addEventListener("resize", sizeCanvas); }
      sample(0);
      if (DIALECT === "css") {
        var stage = document.querySelector(".stage");
        TARGETS.forEach(function (n) { var el = document.querySelector("." + n); if (el) getComputedStyle(el).transform; });
        stage.classList.add("is-on");
      }
      post({ type: "ready" });
      if (SHOULD_PLAY && !userPaused) clock.play();
    }); });
  };
})();
`;
}

function canvasLoader(o: HarnessOptions) {
  const subjects = o.targets.map((n) => `${JSON.stringify(n)}: typeof ${ident(n)} !== "undefined" ? ${ident(n)} : undefined`).join(", ");
  return `
window.__ibLoad = function (code, hot) {
  try {
    var api = new Function(code + "\\n;return { update: typeof update === 'function' ? update : null, draw: typeof draw === 'function' ? draw : null, setup: typeof setup === 'function' ? setup : null, subjects: { ${subjects.replace(/"/g, '\\"')} } };")();
    window.__ibCanvas(api);
  } catch (e) {
    parent.postMessage({ ib: 1, type: "error", message: String(e && e.message || e) }, "*");
  }
};
`;
}

const esc = (s: string) => s.replace(/<\/(script|style)/gi, "<\\/$1");

export function buildSrcdoc(o: HarnessOptions): string {
  const { colors } = o;
  const rows = o.targets.length;
  const libs =
    o.dialect === "motion"
      ? `<script src="/vendor/motion.js"></script>`
      : o.dialect === "gsap"
        ? `<script src="/vendor/gsap.min.js"></script><script src="/vendor/CustomEase.min.js"></script>`
        : "";
  const targetCss = o.targets
    .map((t, i) => {
      const top = rows === 1 ? "50%" : `${(((i + 1) / (rows + 1)) * 100).toFixed(3)}%`;
      return `.${t}{position:absolute;left:${(o.originX ?? 60) - 20}px;top:calc(${top} - 20px);width:40px;height:40px;border-radius:6px;background:${colors.red};}`;
    })
    .join("\n");
  const stage =
    o.dialect === "canvas"
      ? `<canvas class="ib-canvas"></canvas>`
      : `<div class="stage">${o.targets.map((t) => `<div class="${t}"></div>`).join("")}</div>`;

  let user = "";
  if (o.dialect === "css") user = `<style id="user">${esc(o.code)}</style>`;
  const script =
    o.dialect === "canvas"
      ? `<script>${canvasLoader(o)}</script><script>window.__ibStart();window.__ibLoad(${esc(JSON.stringify(o.code))}, false);</script>`
      : o.dialect === "css"
        ? `<script>window.__ibStart();</script>`
        : `<script>window.__ibStart();</script><script>try{(function(){\n${esc(rewriteImports(o.code))}\n})();}catch(e){parent.postMessage({ib:1,type:"error",message:String(e&&e.message||e)},"*");}</script>`;

  return `<!doctype html><html><head><meta charset="utf-8">
<style>
html,body{margin:0;height:100%;background:transparent;overflow:hidden;font:12px/1.4 ui-monospace,monospace;color:${colors.ink};}
.stage{position:relative;height:100%;}
canvas.ib-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;}
${targetCss}
</style>
<script>${runtime(o)}</script>
${libs}
${user}
</head><body>${stage}${script}</body></html>`;
}
