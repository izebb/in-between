// Policy check: every motion in the app's chrome uses the tokens (§1.6).
// Flags raw durations, cubic-bezier()/linear() curves, and easing keywords in
// transition/animation declarations anywhere outside the token sources.
// Figure and lab *content* (the values a lesson is about) is data, not chrome: it lives in
// component props and codegen, and is exempt when it isn't in a style declaration.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const src = join(root, "apps/web/src");
const EXEMPT = [
  "styles/tokens.css", // generated from tokens.json
  "motion/tokens.ts", // generated
  "motion/tokens.json",
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

const styleOf = (file, text) => {
  if (file.endsWith(".css")) return [{ text, offset: 0 }];
  const blocks = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/g;
  let m;
  while ((m = re.exec(text))) blocks.push({ text: m[1], offset: m.index + m[0].indexOf(m[1]) });
  // Inline style="transition: …" attributes too
  const attr = /style=["'`{]([^"'`}]*(?:transition|animation)[^"'`}]*)/g;
  while ((m = attr.exec(text))) blocks.push({ text: m[1], offset: m.index });
  return blocks;
};

const declRe = /(transition(?:-duration|-timing-function|-delay)?|animation(?:-duration|-timing-function|-delay)?)\s*:\s*([^;{}]+)/g;
const bad = [
  { re: /(?<![\w-])\d*\.?\d+m?s\b/, why: "raw duration" },
  { re: /cubic-bezier\(/, why: "raw cubic-bezier()" },
  { re: /(?<![\w-])linear\(/, why: "raw linear() curve" },
  { re: /(?<![\w-])(ease|ease-in|ease-out|ease-in-out)(?![\w-])/, why: "easing keyword" },
];

const problems = [];
for (const file of walk(src)) {
  if (!/\.(css|astro|svelte)$/.test(file)) continue;
  const rel = relative(src, file);
  if (EXEMPT.includes(rel)) continue;
  const text = readFileSync(file, "utf8");
  for (const block of styleOf(file, text)) {
    let m;
    declRe.lastIndex = 0;
    while ((m = declRe.exec(block.text))) {
      const value = m[2].replace(/var\([^)]*\)/g, "").replace(/calc\([^)]*\)/g, "");
      for (const b of bad) {
        if (b.re.test(value)) {
          const line = text.slice(0, block.offset + m.index).split("\n").length;
          problems.push(`${rel}:${line}  ${b.why}: ${m[0].trim().slice(0, 90)}`);
        }
      }
    }
  }
}

// Imperative UI motion (layouts, ui components, motion layer) must take timing from tokens.
for (const file of walk(src)) {
  const rel = relative(src, file);
  if (!/^(layouts|components\/ui|motion|pages)\//.test(rel) || !/\.(ts|astro|svelte)$/.test(file)) continue;
  if (EXEMPT.includes(rel)) continue;
  const text = readFileSync(file, "utf8");
  const re = /\.animate\([\s\S]{0,400}?\{[^}]*duration:\s*(\d+)/g;
  let m;
  while ((m = re.exec(text))) {
    const line = text.slice(0, m.index).split("\n").length;
    problems.push(`${rel}:${line}  raw duration in .animate(): ${m[1]}`);
  }
}

if (problems.length) {
  console.log(`Motion policy: ${problems.length} ad-hoc value(s) found. Use the tokens in src/motion/tokens.json.\n`);
  for (const p of problems) console.log("  " + p);
  process.exit(1);
}
console.log("Motion policy: clean. Every transition uses tokens.");
