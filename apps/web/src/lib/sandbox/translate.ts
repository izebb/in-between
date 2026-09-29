/**
 * The Frame stepper's CSS ⇄ JS switch keeps the reader's example: a CSS transition written as
 * `.box { …; transition: … }` + `.is-on .box { … }` becomes the same motion in Web Animations,
 * and two-keyframe `el.animate()` calls become the transition. Anything else (keyframes,
 * loops, FLIP…) returns null and the caller falls back to a demo.
 */

const camel = (p: string) => p.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
const kebab = (p: string) => p.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

/** Split on a separator that isn't inside parentheses or quotes. */
function splitTop(s: string, sep: RegExp): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let cur = "";
  for (const ch of s) {
    if (quote) {
      if (ch === quote) quote = null;
    } else if (ch === "'" || ch === '"') quote = ch;
    else if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (depth === 0 && sep.test(ch)) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

const ms = (t: string) => (t.endsWith("ms") ? parseFloat(t) : parseFloat(t) * 1000);
const isTime = (t: string) => /^-?[\d.]+m?s$/.test(t);
const isEasing = (t: string) =>
  /^(linear|ease|ease-in|ease-out|ease-in-out|step-start|step-end)$/.test(t) || /^(cubic-bezier|steps|linear)\(/.test(t);

function declarations(body: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const d of splitTop(body, /;/)) {
    const i = d.indexOf(":");
    if (i > 0) m.set(d.slice(0, i).trim(), d.slice(i + 1).trim());
  }
  return m;
}

/** The comment that introduces the code (CSS: the one right before the first rule) → its lines. */
function leadComment(code: string, style: "css" | "js"): string[] {
  const t = code.trimStart();
  if (style === "css") {
    const brace = t.replace(/\/\*[\s\S]*?\*\//g, (c) => " ".repeat(c.length)).indexOf("{");
    const head = t.slice(0, brace < 0 ? t.length : brace);
    const all = [...head.matchAll(/\/\*([\s\S]*?)\*\//g)];
    const m = all[all.length - 1];
    return m ? m[1].split("\n").map((l) => l.replace(/^\s*\*?\s?/, "").trimEnd()).filter(Boolean) : [];
  }
  const lines: string[] = [];
  for (const l of t.split("\n")) {
    const m = l.match(/^\s*\/\/\s?(.*)$/);
    if (!m) break;
    lines.push(m[1]);
  }
  return lines;
}

/** A JS string literal for a CSS value (numbers stay numbers). */
const quote = (v: string) => (v.includes("'") ? `"${v.replace(/"/g, '\\"')}"` : `'${v}'`);
const jsValue = (v: string) => (/^-?[\d.]+$/.test(v) ? v : quote(v));
/** Where a transition starts when the rule doesn't say: the property's initial value. */
const INITIAL: Record<string, string> = { transform: "none", translate: "none", scale: "none", rotate: "none", opacity: "1", filter: "none" };

/** A CSS transition (`.x {…}` → `.is-on .x {…}`) as Web Animations. */
export function cssToWaapi(css: string): string | null {
  const body = css.replace(/\/\*[\s\S]*?\*\//g, "");
  if (/[@]/.test(body)) return null;
  const rules = [...body.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), decl: declarations(m[2]) }));
  const leftover = body.replace(/([^{}]+)\{([^{}]*)\}/g, "").trim();
  if (!rules.length || leftover) return null;
  const targets: { name: string; base: Map<string, string>; on: Map<string, string> }[] = [];
  for (const r of rules) {
    const base = r.sel.match(/^\.([\w-]+)$/);
    const on = r.sel.match(/^\.is-on\s+\.([\w-]+)$/);
    const name = base?.[1] ?? on?.[1];
    if (!name) return null;
    let t = targets.find((x) => x.name === name);
    if (!t) targets.push((t = { name, base: new Map(), on: new Map() }));
    for (const [k, v] of r.decl) (base ? t.base : t.on).set(k, v);
  }
  const out: string[] = [];
  const comment = leadComment(css, "css");
  if (comment.length) out.push(...comment.map((l) => `// ${l}`), "");
  let any = false;
  for (const t of targets) {
    const v = t.name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out.push(`const ${v} = document.querySelector('.${t.name}');`);
    const transition = t.base.get("transition");
    const groups: { key: string; duration: number; easing: string; delay: number; props: string[] }[] = [];
    for (const item of transition ? splitTop(transition, /,/) : []) {
      const toks = splitTop(item, /\s/);
      const times = toks.filter(isTime);
      const easing = toks.find(isEasing) ?? "ease";
      const prop = toks.find((x) => !isTime(x) && !isEasing(x)) ?? "all";
      const props = prop === "all" ? [...t.on.keys()] : t.on.has(prop) ? [prop] : [];
      if (!props.length) continue;
      const duration = times[0] ? ms(times[0]) : 0;
      const delay = times[1] ? ms(times[1]) : 0;
      const key = `${duration}|${easing}|${delay}`;
      const g = groups.find((x) => x.key === key);
      if (g) g.props.push(...props);
      else groups.push({ key, duration, easing, delay, props });
    }
    const moved = new Set(groups.flatMap((g) => g.props));
    for (const [k, val] of t.base) if (k !== "transition" && !moved.has(k)) out.push(`${v}.style.setProperty('${k}', ${quote(val)});`);
    for (const g of groups) {
      const from = (p: string) => t.base.get(p) ?? INITIAL[p];
      if (g.props.some((p) => from(p) === undefined)) return null; // no start value to animate from
      const frame = (value: (p: string) => string | undefined) => `{ ${g.props.map((p) => `${camel(p)}: ${jsValue(value(p) ?? "")}`).join(", ")} }`;
      out.push(
        "",
        `${v}.animate(`,
        `  [${frame(from)}, ${frame((p) => t.on.get(p))}],`,
        `  { duration: ${g.duration}${g.delay ? `, delay: ${g.delay}` : ""}, easing: '${g.easing}', fill: 'both' },`,
        ");",
      );
      any = true;
    }
    for (const [k, val] of t.on) if (!moved.has(k)) out.push(`${v}.style.setProperty('${k}', ${quote(val)});`);
  }
  return any ? out.join("\n") + "\n" : null;
}

/** Two-keyframe `el.animate()` calls as a CSS transition. */
export function waapiToCss(js: string): string | null {
  let rest = js.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const names = new Map<string, string>();
  rest = rest.replace(/(?:const|let|var)\s+(\w+)\s*=\s*document\.querySelector\(\s*['"]\.([\w-]+)['"]\s*\)\s*;?/g, (_, v: string, cls: string) => {
    names.set(v, cls);
    return "";
  });
  const calls: { cls: string; from: Map<string, string>; to: Map<string, string>; opts: Map<string, string> }[] = [];
  const obj = (s: string) => {
    const m = new Map<string, string>();
    for (const p of splitTop(s, /,/)) {
      const i = p.indexOf(":");
      if (i < 0) return null;
      m.set(p.slice(0, i).trim(), p.slice(i + 1).trim().replace(/^['"]|['"]$/g, ""));
    }
    return m;
  };
  let bad = false;
  rest = rest.replace(
    /(\w+)\.animate\(\s*\[\s*\{([^{}]*)\}\s*,\s*\{([^{}]*)\}\s*,?\s*\]\s*,\s*\{([^{}]*)\}\s*,?\s*\)\s*;?/g,
    (_, v: string, a: string, b: string, o: string) => {
      const cls = names.get(v);
      const from = obj(a);
      const to = obj(b);
      const opts = obj(o);
      if (!cls || !from || !to || !opts || [...opts.keys()].some((k) => !["duration", "easing", "delay", "fill"].includes(k))) bad = true;
      else calls.push({ cls, from, to, opts });
      return "";
    },
  );
  if (bad || !calls.length || rest.replace(/[\s;]/g, "")) return null;
  const out: string[] = [];
  const comment = leadComment(js, "js");
  if (comment.length) out.push(`/* ${comment.join("\n   ")} */`);
  for (const cls of [...new Set(calls.map((c) => c.cls))]) {
    const mine = calls.filter((c) => c.cls === cls);
    const from = new Map<string, string>();
    const to = new Map<string, string>();
    const trans: string[] = [];
    for (const c of mine) {
      const d = c.opts.get("duration") ?? "0";
      const e = c.opts.get("easing") ?? "linear"; // WAAPI's default easing is linear, CSS's is ease
      const delay = c.opts.get("delay");
      for (const [k, v] of c.from) from.set(kebab(k), v);
      for (const [k, v] of c.to) {
        to.set(kebab(k), v);
        trans.push(`${kebab(k)} ${d}ms ${e}${delay && delay !== "0" ? ` ${delay}ms` : ""}`);
      }
    }
    out.push(`.${cls} {`);
    for (const [k, v] of from) out.push(`  ${k}: ${v};`);
    out.push(trans.length === 1 ? `  transition: ${trans[0]};` : `  transition:\n    ${trans.join(",\n    ")};`);
    out.push("}", "", `.is-on .${cls} {`);
    for (const [k, v] of to) out.push(`  ${k}: ${v};`);
    out.push("}", "");
  }
  return out.join("\n");
}
