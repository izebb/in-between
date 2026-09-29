# Chapter kit: how to write an Inbetween chapter

Read `CURRICULUM.md` §1 (visual direction), §3 (the chapter's brief) and §5.3 (Definition of Done) first.
Then read the three finished chapters, which are the house style:
`apps/web/src/content/chapters/01-motion-is-information.mdx`, `02-timing.mdx`, `03-spacing.mdx`.

## Voice

- Simple and clear. Short sentences. Concrete examples. No filler, no hype, no "In this chapter we will…".
- Say the idea, show it, then name it. Prefer "A slow move feels heavy." to "Duration can convey weight."
- Second person is fine ("you"). No exclamation marks. No emoji.
- Every fact must be true. If you are not sure of a number, a date, or an attribution, leave it out.
  "In the wild" references must be real, checkable, and described accurately (product, feature, behaviour).
- Numbers are measurements: write `280ms`, `0.8`, `cubic-bezier(.2, .8, .2, 1)` in backticks when they are code.

## File

`apps/web/src/content/chapters/<slug>.mdx` — slug and title come from `apps/web/src/lib/curriculum.ts` (don't edit it).

```mdx
---
number: 4
lede: "One sentence, the chapter's idea. Shown in italics under the title."
---
```

The page title, part, chapter number and instrument chips are added automatically. Start with 1–2 short intro paragraphs.

## Shape (every chapter)

Use `<Beat>` headings in this order. `kind="more"` makes a plain section heading for extra material.

1. `<Beat kind="see">…</Beat>` — a live figure demonstrating the idea, in a numbered `<Figure>`.
2. `<Beat kind="feel">…</Beat>` — a `<FeelAB>` judged by eye. **It must come before any number is shown in the
   chapter.** So SEE figures before it use `readout={false}` and word labels, and prose before it has no ms/px values.
3. Explanatory sections (`kind="more"`), with numbers now allowed. Marginalia sit beside these.
4. `<Beat kind="tune">…</Beat>` — one instrument, pre-configured, via `<Lab id="…" … code={false} />`.
5. `<Beat kind="write">…</Beat>` — code last, as `<Snippet>` cards: at least one **CSS** and one **JS** form, each
   with an "Open in Lab" (`lab="…"` + shorthand). Wrap several in `<div class="snippets">…</div>`.
6. `<Beat kind="drill">…</Beat>` — `<Drill kind="…" trials={5} chapter={N} />`.

## Definition of Done (§5.3) — check every box

- [ ] One live figure with a numbered caption (`<Figure n="4.1" caption="…">`). Number figures `chapter.index`.
- [ ] One FEEL moment (A/B or toggle) before any number is shown.
- [ ] One instrument, pre-configured (`<Lab>`).
- [ ] Code last, CSS **and** one JS form, as snippet cards that open in the Lab.
- [ ] A reduced-motion version that still teaches — the kit's figures do this automatically (their "Still" toggle
      renders the onion skin). Don't add motion outside the kit's figures.
- [ ] One drill (`<Drill>`).
- [ ] One "in the wild" reference in the margin (`<Margin kind="wild">`).

## Components (no imports needed in MDX)

### Layout
- `<Figure n="4.1" caption="Heavy and light on the same arc"> …live figure… </Figure>` — the plate. Caption is set
  in small caps automatically; write it in sentence case, short (`"Ease-out, 12 fr, spacing chart"`).
  `static` prop hides the Still toggle (for figures with no motion).
- `<Margin kind="wild|def|history|note|read"> <p>…</p> </Margin>` — place it **directly before** the paragraph it
  annotates. Keep to 1–3 sentences. `wild` = a real product/site example.
- `<Beat kind="see|feel|tune|write|drill|more">Heading</Beat>`.
- Plain Markdown: paragraphs, lists, **bold**, *italic*, `code`, tables (GFM), blockquotes.

### Figures
- `<SpacingChart rows={[{ label, easing, duration, to, delay, property, tone }]} readout chart ghosts stepper />`
  onion-skin spacing chart. Or `curve="ease-out" frames={12}` for one row. `tone: "blue"` marks a comparison row.
  `readout={false}` hides ms/frame counts (use before FEEL). `chart={false}` hides the tick chart.
- `<CurvePlot easing="--ease-out" compare="linear" duration={600} velocity label compareLabel />` — curve + velocity + motion.
  `xLabel="scroll →"` / `yLabel="progress"` relabel the axes. Colours: the main curve is ink (solid), `compare` is
  blue (dashed); the moving dot is red. (SpringPlot differs: its
  first spring is the red/ink one, later springs blue.)
- `<SpringPlot springs={[{ response: 0.5, bounce: 0.3, label: "bouncy" }, { stiffness: 170, damping: 26, mass: 1 }]} envelope />`
  — spring position over real time, settle marker, overshoot; first spring red, others blue.
  `readout={false}` hides every number (use it before FEEL). Big overshoots stay inside the track.
- `<Canvas program="bouncing-ball" params={{ gravity: 1800 }} controls stepper readout />` (`readout={false}` hides ms
  on the time bar; `controls={false}` hides knobs) — a live canvas program with its
  own knobs, time bar, and "Open in Canvas Sandbox". Programs live in `apps/web/src/lib/canvas/programs.ts`
  (existing: `bouncing-ball`, `heavy-light`, `interrupt`, `flick`, `spring-mass`, and in `programs2.ts`:
  `loop-hz` (30/60/120Hz, per-frame vs dt), `smoothing-trap` (x += (t−x)·k vs 1−e^(−λdt) at three rates),
  `integrators` (explicit Euler / semi-implicit / Verlet, step option), `collisions` (gravity, walls, restitution,
  friction; tap to add), `particles` (emit/live/die; drag the emitter), `trails` (translucent clears), `boids`
  (separation/alignment/cohesion), `noise-vs-random`, `idle` (sine vs uneven sines vs noise)). To add one, follow that file's
  pattern: plain JS `setup(w, h) → state`, `update(state, dt)`, `draw(ctx, state, w, h)`, optional
  `onPointer(state, pointer, type)`, `const LOOP = seconds;`. Read colours from `pencils.red/blue/ink/graphite/rule`
  at draw time (ghost stills swap red for blue). Helpers: `lerp, clamp, damp, random, noise1, noise2, cubicBezier,
  circle, segment, label, TAU`. Seed randomness in `setup` with `rand = seeded(n)` so replays are identical.
- `<Specimens items={[{ kind: "menu", label: "Causality", note: "…", motion: { easing, duration } }]} height={130} />`
  — a row of UI specimens that play on hover.
- `<FeelAB question="…" kind="card" options={[{ motion: {…} }, { motion: {…} }]} answer={1} explain="…" />`
  — pick mode (numbers are revealed after the pick). `mode="toggle"` with options `[with, { motion: { none: true } }]`.
  `direction="enter|exit|loop"`.

- `<Principles />` — the twelve principles as UI clips (hover to play); `only={["arcs", "timing"]}` shows a subset.
  Ids: squash, anticipation, staging, straight-pose, follow-through, slow-in-out, arcs, secondary, timing,
  exaggeration, solid, appeal.
- `<Choreo tracks={[{ target: "a", property: "y", from: 20, to: 0, duration: 360, easing: "--ease-out" }, …]} stagger={40} layout="list|boxes|cards" sheet />`
  — several elements + a read-only exposure sheet (bars = delay → end, easing drawn inside) on one clock.
  `stagger` adds that many ms of delay per target, in order. Properties: x, y, scale, opacity, rotate.
- `<Flip />` — FLIP by hand: step First, Last, Invert, Play (or run all four); ghosts + highlighted code line.
- `<ViewTransition />` — a real same-document View Transition: list → detail with shared elements (toggleable).
- `<Discrete />` — a real CSS enter/exit with `@starting-style` + `transition-behavior: allow-discrete`, source shown.
- `<Spatial />` — an app as a place: push (x = sequence), sheet (z = depth), back; map of where you are;
  toggle to scramble the directions.

- `<Drag response={0.35} bounce={0.1} />` — direct manipulation, for real: 1:1 drag with pointer capture, rubber-band
  past the edges, release velocity (last ~100ms) projected to a landing, nearest detent chosen, spring carries the
  velocity. Toggles let readers switch each behaviour off.
- `<Scroll />` — real CSS scroll-driven animations (`animation-timeline: scroll()` progress bar, `view()` card
  reveals) inside a scroller, with a "scroll-jacked" mode for comparison and a no-support fallback note.
- `<Medium initial={800} modes={["transform", "left", "canvas"]} readout />` — N dots moved with DOM transform, DOM left/top,
  or Canvas 2D; measured frame time and fps on the reader's machine (runs only while on screen; under Still or
  reduced motion it waits for a "Run the test" click). `readout={false}` hides the numbers.
- `<Pipeline />` — Style → Layout → Paint → Composite: pick a property (left, width, background-color, box-shadow,
  transform, opacity) and see which stages run every frame, with a live element.
- `<Count values={[3912, 2047]} />` — a number changing instantly, counting up, or rolling digit by digit;
  tabular numerals toggle.
- `<Architecture />` — this app's own motion system, layer by layer (tokens → primitives → orchestration → patterns
  → policy), each item playable with the real modules; interruption-contract demo.

UI specimen kinds (`kind`): `dot card modal toast menu list drawer toggle like drop expand swap tabs badge progress`.
Motion (`MockMotion`): `{ easing, duration, distance, stagger, exitEasing, exitDuration, none, origin }`
(`origin` = transform-origin for menu/dialog/panel, e.g. `"top left"` vs `"center"`).

### Easing shorthand (anywhere an `easing` string is accepted)
`linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`, `--ease-out`, `--ease-in`, `--ease-inout` (the app's tokens),
`cubic-bezier(.2,.8,.2,1)`, `steps(6)`, `steps(4, jump-start)`, `spring(170 26 1)` (k c m),
`spring(response .5 bounce .2)`, `spring.snappy`, `spring.soft`, `linear(0, .5 20%, 1)`.

### Instruments and code
- `<Lab id="spacing-chart|curve-bench|spring-bench|exposure-sheet|frame-stepper|canvas-sandbox" easing duration distance compare code={false} />`
  Spring bench shorthand: `response bounce` or `stiffness damping mass`. Frame stepper / canvas sandbox: `source={x}`.
  Canvas sandbox: `program="bouncing-ball"`. Exposure sheet: `source="list|overlap|unison|cascade"` picks a preset,
  or pass a custom scene with `extra={{ scene: { moves: [...] }, layout, stagger, staggerProp }}` (easings in a custom
  scene must be spec objects such as `{ type: "cubic", x1, y1, x2, y2 }`, not shorthand strings).
  Data stage (L10): `<Lab id="data-stage" extra={{ from: "a-z", to: "by-value", keying: "data", staging: "together", stagger: 30 }} />`
  (states: a-z, by-value, 2024, north, grouped; keying data|index; staging together|staged; renderer svg|canvas).
  Specimen journal: `<Lab id="specimen-journal" />`. Export desk: `<Lab id="export-desk" easing="…" duration={…} />`.
- `<Snippet title="04 · Weight: a bounce in keyframes" lab="curve-bench" easing="…" duration={…}>` then a fenced
  code block (blank line before and after). Title format: `NN · Chapter: what it does`.
- Code inside JSX props loses indentation: put multi-line code in `export const x = \`…\`;` right after the
  frontmatter and pass `source={x}`.

### Drills (`<Drill kind="…">`)
`what-it-says`, `guess-duration`, `match-curve`, `which-heavier`, `tune-to-match`, `blind-ab`, `spot-principle`,
`fix-feeling`, `transition-lies`.
Blind A/B can be focused with `topic="…"`: easing, spacing, enter-exit, timing, taste, frequency, stagger,
choreography, hierarchy, springs, direct, physics, continuity, permanence, information, attention, principles,
spatial, momentum, weight, feedback, performance, medium.

## Rules

- Stillness is the canvas: no decorative motion. Only kit figures move.
- Red pencil = what is (moving object, key, current frame). Blue pencil = ghosts, paths, "what could be".
  Kit components already follow this; don't fight it.
- Keep each chapter focused: one idea per figure. Taste over quantity: 2–4 figures is plenty.
- Don't edit shared components, styles, or `curriculum.ts`. If you need something the kit lacks, say so in your report.
- Don't commit. Don't restart the dev server.

## Preview

A dev server runs at http://localhost:4321. Your chapter is at `/chapters/<slug>`.
Screenshot it (both themes, desktop and phone) and look at the images:

```sh
node scripts/shoot.mjs --pages /chapters/<slug> --out /tmp/<you> --themes light,dark --widths 1280,375 --full --wait 1500
```

`--selector "#fig-4-1" --scrollthrough` captures one figure. The script prints page errors; there must be none.
Then run `pnpm --filter @inbetween/web exec astro check` (0 errors) and `node scripts/check-motion-tokens.mjs`.
