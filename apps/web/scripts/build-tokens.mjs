// Compile src/motion/tokens.json → CSS variables, TypeScript, and Figma variables.
// One source of truth, three notations (chapter 24: design ↔ code handoff).
// Springs are compiled to CSS `linear()` with @inbetween/core, so CSS gets real physics.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fromResponse, springToLinear } from "../../../packages/core/src/index.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tokens = JSON.parse(readFileSync(resolve(root, "src/motion/tokens.json"), "utf8"));

const HEADER = "GENERATED from src/motion/tokens.json by scripts/build-tokens.mjs. Do not edit by hand.";
const bez = (p) => `cubic-bezier(${p.join(", ")})`;
const exitMs = (ms) => Math.round(ms * tokens.exitRatio);

const springs = Object.fromEntries(
  Object.entries(tokens.spring).map(([name, s]) => {
    const params = fromResponse(s.response, s.bounce, 1);
    const { easing, duration } = springToLinear(params, { tolerance: 0.0015 });
    return [name, { ...s, ...params, linear: easing, duration }];
  }),
);

// ---------- CSS ----------
const colorVars = (mode) =>
  Object.entries(tokens.color)
    .map(([name, c]) => `    --${name}: ${c[mode]};`)
    .join("\n");
const indent = (text, by = "  ") => text.replace(/^/gm, by);

// Themes: every theme but Pencil (the tokens above) overrides type and shape, and brings its own light
// and dark: colours, and the few shape values that differ by mode (shadows, the ground).
const themeIds = Object.keys(tokens.themes).filter((k) => !k.startsWith("$"));
const vars = (o) => Object.entries(o).map(([k, v]) => `    --${k}: ${v};`).join("\n");
const themeCss = themeIds
  .filter((id) => tokens.themes[id].light)
  .map((id) => {
    const t = tokens.themes[id];
    const sel = `:root[data-theme="${id}"]`;
    return `  /* Theme: ${t.name} (${t.fonts}). ${t.note} */
  ${sel} {
    color-scheme: light;
    --font-display: ${t.font.display};
    --font-body: ${t.font.body};
    --font-mono: ${t.font.mono};
${vars(t.shape)}
${vars(t.light)}
  }
  ${sel}[data-mode="dark"] {
    color-scheme: dark;
${vars(t.dark)}
  }
  @media (prefers-color-scheme: dark) {
    ${sel}:not([data-mode="light"]) {
      color-scheme: dark;
${indent(vars(t.dark))}
    }
  }`;
  })
  .join("\n\n");

const css = `/* ${HEADER} */

@layer tokens {
  :root {
    color-scheme: light;
${colorVars("light")}

    --font-display: ${tokens.font.display};
    --font-body: ${tokens.font.body};
    --font-mono: ${tokens.font.mono};

    /* Shape: what a theme reshapes. The outline of a control follows the rule unless a theme says. */
${Object.entries(tokens.shape)
  .map(([k, v]) => `    --${k}: ${v.value}; /* ${v.use} */`)
  .join("\n")}
    --outline: var(--rule);

    /* Durations (§1.6). Exits run at ${tokens.exitRatio}× the enter. */
${Object.entries(tokens.duration)
  .map(([k, d]) => `    --dur-${k}: ${d.value}ms; /* ${d.use} */\n    --dur-${k}-exit: ${exitMs(d.value)}ms;`)
  .join("\n")}

    /* Curves */
${Object.entries(tokens.easing)
  .map(([k, e]) => `    --ease-${k}: ${bez(e.value)}; /* ${e.use} */`)
  .join("\n")}

    /* Springs, compiled to linear() by @inbetween/core */
${Object.entries(springs)
  .map(
    ([k, s]) =>
      `    /* spring.${k}: response ${s.response}, bounce ${s.bounce} (${s.use}) */\n    --spring-${k}: ${s.linear};\n    --spring-${k}-dur: ${s.duration}ms;`,
  )
  .join("\n")}

    /* Distances */
${Object.entries(tokens.distance)
  .map(([k, d]) => `    --dist-${k}: ${d.value}px; /* ${d.use} */`)
  .join("\n")}

    /* Orchestration */
    --stagger-step: ${tokens.stagger.step.value}ms;
  }

  /* Mode: light or dark, chosen or the system's. */
  :root[data-mode="dark"] {
    color-scheme: dark;
${colorVars("dark")}
  }

  @media (prefers-color-scheme: dark) {
    :root:not([data-mode="light"]) {
      color-scheme: dark;
${colorVars("dark").replace(/^    /gm, "      ")}
    }
  }

${themeCss}

  /* On paper it is always paper: printed pages take Pencil's light colours, whatever the screen's theme. */
  @media print {
    :root:root:root {
      color-scheme: light;
${colorVars("light").replace(/^    /gm, "      ")}
    }
  }

  /* Policy: reduce, don't remove. Movement stops; fades and ghosts stay. */
  :root[data-motion="reduce"] {
${Object.keys(tokens.distance)
  .map((k) => `    --dist-${k}: 0px;`)
  .join("\n")}
  }
  @media (prefers-reduced-motion: reduce) {
    :root:not([data-motion="full"]) {
${Object.keys(tokens.distance)
  .map((k) => `      --dist-${k}: 0px;`)
  .join("\n")}
    }
  }
}
`;

// ---------- TypeScript ----------
const num = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v.value]));
const ts = `// ${HEADER}

export const duration = ${JSON.stringify(num(tokens.duration))} as const;
export const exitDuration = ${JSON.stringify(Object.fromEntries(Object.entries(tokens.duration).map(([k, d]) => [k, exitMs(d.value)])))} as const;
export const exitRatio = ${tokens.exitRatio};
export const easing = ${JSON.stringify(Object.fromEntries(Object.entries(tokens.easing).map(([k, e]) => [k, e.value])))} as const;
export const easingCss = ${JSON.stringify(Object.fromEntries(Object.entries(tokens.easing).map(([k, e]) => [k, bez(e.value)])))} as const;
export const spring = ${JSON.stringify(springs, null, 2)} as const;
export const distance = ${JSON.stringify(num(tokens.distance))} as const;
export const stagger = ${JSON.stringify(num(tokens.stagger))} as const;
export const color = ${JSON.stringify(Object.fromEntries(Object.entries(tokens.color).map(([k, c]) => [k, { light: c.light, dark: c.dark }])))} as const;
/** Each theme's name, type and a swatch of its colours in each mode (paper, ink, the two pencils). */
export const themes = ${JSON.stringify(
  themeIds.map((id) => {
    const t = tokens.themes[id];
    const pick = (m) => {
      const c = t[m] ?? Object.fromEntries(Object.entries(tokens.color).map(([k, v]) => [k, v[m]]));
      return { paper: t.swatch?.[m] ?? c.paper, ink: c.ink, blue: c["blue-pencil"], red: c["red-pencil"] };
    };
    return { id, name: t.name, fonts: t.fonts, note: t.note, display: (t.font ?? tokens.font).display, light: pick("light"), dark: pick("dark") };
  }),
  null,
  2,
)} as const;
export type ThemeId = (typeof themes)[number]["id"];
export const usage = ${JSON.stringify({
  duration: Object.fromEntries(Object.entries(tokens.duration).map(([k, d]) => [k, d.use])),
  easing: Object.fromEntries(Object.entries(tokens.easing).map(([k, e]) => [k, e.use])),
  spring: Object.fromEntries(Object.entries(tokens.spring).map(([k, s]) => [k, s.use])),
  distance: Object.fromEntries(Object.entries(tokens.distance).map(([k, d]) => [k, d.use])),
})} as const;

export type DurationToken = keyof typeof duration;
export type EasingToken = keyof typeof easing;
export type SpringToken = keyof typeof spring;
`;

// ---------- Figma variables ----------
const figma = {
  $description: HEADER,
  collections: [
    {
      name: "Inbetween / Color",
      modes: ["Paper", "Lightbox"],
      variables: Object.entries(tokens.color).map(([name, c]) => ({
        name,
        type: "COLOR",
        description: c.meaning,
        values: { Paper: c.light, Lightbox: c.dark },
      })),
    },
    {
      name: "Inbetween / Motion",
      modes: ["Default"],
      variables: [
        ...Object.entries(tokens.duration).map(([k, d]) => ({ name: `duration/${k}`, type: "FLOAT", description: d.use, values: { Default: d.value } })),
        ...Object.entries(tokens.easing).map(([k, e]) => ({ name: `easing/${k}`, type: "STRING", description: e.use, values: { Default: bez(e.value) } })),
        ...Object.entries(springs).flatMap(([k, s]) => [
          { name: `spring/${k}/response`, type: "FLOAT", description: s.use, values: { Default: s.response } },
          { name: `spring/${k}/bounce`, type: "FLOAT", description: s.use, values: { Default: s.bounce } },
        ]),
        ...Object.entries(tokens.distance).map(([k, d]) => ({ name: `distance/${k}`, type: "FLOAT", description: d.use, values: { Default: d.value } })),
      ],
    },
  ],
};

const write = (rel, text) => {
  const p = resolve(root, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, text);
};
write("src/styles/tokens.css", css);
write("src/motion/tokens.ts", ts);
write("public/tokens.figma.json", JSON.stringify(figma, null, 2) + "\n");
console.log(`tokens: css, ts, figma written (spring.snappy ${springs.snappy.duration}ms, spring.soft ${springs.soft.duration}ms)`);
