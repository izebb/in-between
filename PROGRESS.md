# Inbetween — build progress

Source of truth: `CURRICULUM.md`. Task brief: `PROMPT.md`. This file is enough to resume from.

## Status

| # | Milestone | State |
|---|---|---|
| M0 | Design system | ✅ done |
| M1 | Motion core | ✅ done |
| M2 | First instruments (L1, L2, L5, Code Panel) | ✅ done |
| M3 | Part I live (ch 01–03 + 2 drills) | ✅ done |
| M4 | Physics (L3, L7, ch 04–06) | ✅ done (commit 481fae4) |
| M5 | Choreography (L4, ch 07–11) | ✅ done |
| M6 | Interaction + Canvas (ch 12–19) | ✅ done (commit d0b0f28) |
| M7 | Craft + Journal (L8, L9, ch 20–22, calibration graph) | ✅ done (commit 4ae84f0) |
| M8 | Special Topics (L10, ch 23–25) | ✅ done |

All 25 chapters, 10 instruments (L1–L10) and 9 drills are built; `pnpm build` passes (38 pages). Screenshots of
the index, a chapter, the lab and the Eye Trainer (light/dark, 1280/375) are in `docs/images/`.

## How to run

```sh
pnpm install
pnpm dev          # http://localhost:4321  (compiles tokens + copies vendor bundles first)
pnpm build        # motion lint, packages typecheck, then astro check + astro build → apps/web/dist
pnpm lint:motion  # policy: no ad-hoc durations/curves outside the token sources
node scripts/shoot.mjs --pages /,/system --out ./screenshots --themes light,dark --widths 1280,375 [--full]
```

`scripts/shoot.mjs` is a *viewing* tool (headless system Chromium via playwright-core), not a test.

## Repo map

- `packages/core` — zero-dep motion math (`src/*.ts`, imports use `.ts` extensions so Node can run it directly):
  bezier (Newton + bisection), easing (keywords, steps, power, parseEasing), linear (parse/eval/`toLinear` with RDP),
  spring (closed-form under/critical/over-damped, response/bounce ↔ k/c/m, settle time, `springToLinear`),
  decay (λ and iOS rate, `project`, rubberband), loop (rAF + dt + manual clock), playhead (shared scrub/step clock),
  motion (`Move`/`EasingSpec`, `resolveMove`), sample (frames, spacing), keyframes, interpolate (`damp`), integrators
  (Euler / semi-implicit / Verlet / RK4), noise (Perlin, simplex, seeded random), velocity tracker.
- `packages/codegen` — `Scene = { title?, moves: Move[] }` → `generate(dialect, scene)` for css / waapi / motion / gsap /
  canvas. Output `Code { text, bindings[{path, from, to, value, scale, decimals}], lines[{targets}] }`. `Writer` records
  where each bound number was printed. `setPath/getPath/paramSpec` (limits + drag steps), `encodeState/decodeState`
  (URL `?s=`), `diffCode` (token LCS → minimal edits + changed ranges for the flash).
- `packages/editor` — CodeMirror 6 extensions: `pencilTheme/pencilHighlight`, `boundParams` (ranges mapped through
  edits, `fromKnob` annotation, `setHotGroup`), `dragNumbers` (scrub any number; double-press selects it),
  `tokenFlash`, `linkHover` (line ↔ stage). Re-exports the CodeMirror bits the app needs (`cm.ts`).
- `apps/web`
  - `src/motion/tokens.json` — **single source of truth** for colour + motion tokens. `scripts/build-tokens.mjs`
    compiles it to `src/styles/tokens.css`, `src/motion/tokens.ts`, `public/tokens.figma.json` (springs → CSS `linear()` via core).
  - `src/motion/` — the app's motion system, layered as ch. 24 teaches: `tokens` → `primitives.ts` → `orchestration.ts`
    → `patterns.ts` (page cut, figure reveal, token morph) → `policy.ts` (reduced motion, frequency budget, interruption
    contract). `inspector.ts` = hold Alt over anything that moves. `boot.ts` runs per page. `controls.ts` = motion for
    every control: the segmented controls' sliding selection (one observer serves every `.seg`, CSS moves it on the
    snappy spring) and the replay mark's turn on press.
  - `src/styles/` — `index.css` declares layer order: reset, tokens, base, type, layout, components, code, figures, lab, motion, utilities.
  - `src/lib/curriculum.ts` — outline: parts, 25 chapters (slug, summary, specimen, instruments, drill), 10 instruments.
  - `src/lib/vignettes.ts` — the index's chapter pictures: one small screen per chapter where a piece of UI acts out
    the idea; house rules (one stage, one kit, red = subject, blue = notation, t = 0 is the rest pose) in its header.
    `src/lib/specimens.ts` — pencil colours (`readPencils`) and the older onion-skin specimens.
  - `src/lib/store.ts` — IndexedDB (idb-keyval): chapters read, drill sessions, journal.
  - `src/content/chapters/*.mdx` — chapter bodies (frontmatter: `number`, `lede`). Route: `/chapters/<slug>`.
  - `src/components/mdx/` — `Figure` (plate + caption + Still toggle), `Margin`, `Beat`; exported map in `index.ts`
    (passed to `<Content components>` so MDX needs no imports). Svelte islands get thin `.astro` wrappers that apply `client:*`.
  - `src/pages/system.astro` — specimen sheet (living catalog of tokens/primitives).
  - `src/lib/sandbox/` — `clock.ts` (**virtual clock**: patches rAF, performance.now, Date.now and drives every
    CSS/WAAPI animation via getAnimations(); serialised with toString() into iframes), `harness.ts` (builds the
    `<iframe srcdoc sandbox="allow-scripts">` doc: stage, UMD libs from /vendor, import rewriting, sampler posting
    `{t, s:{target:[x,y,scale,opacity,rot]}}` per frame, canvas `update/draw` or `setup/update(state)/draw` contract with
    hot reload), `transport.svelte.ts` (sandbox transport: forward = step/fast-forward, backward = reload + ff),
    `page.svelte.ts` (clock injected into same-origin pages for L5).
  - `src/lib/transport.svelte.ts` — `Transport` interface (+ `PlayheadTransport`); `TimeBar` drives any transport.
  - `src/lib/prefs.svelte.ts` (reactive reduced-motion + pencil colours; `watchPlateStill`), `link.svelte.ts`
    (hot path shared by code lines, knobs, stage marks), `labstate.ts` (`?s=`), `presets.ts`, `sound.ts` (frame tick).
  - `src/components/lab/` — `Instrument` (shell: params | stage | time | code; Save to Journal; Share / Open in Lab),
    `CodePanel` (two-way), `CodeEditor` (free code), `SandboxStage`, `TimeBar` (spring scrub), controls
    (`Slider`, `NumberScrub`, `Seg`, `Field`), instruments `SpacingChart` (L1), `CurveBench` (L2), `FrameStepper` (L5).
  - `src/components/figures/` — `SpacingTrack`, `CurveGraph` (draggable handles), `VelocityGraph`.
  - `/lab/[id].astro` mounts instruments with `client:only` (URL state would mismatch SSR).
  - **Chapter kit** (MDX, no imports needed; registered in `components/mdx/index.ts`):
    `Figure` (plate), `Margin`, `Beat` (see/feel/tune/write/drill; `more` = plain h2), `SpacingChart` (rows or
    `curve`+`frames`), `CurvePlot`, `FeelAB` (pick | toggle), `Specimens` (row of UI mocks), `Snippet` (Shiki card +
    Copy + Open in Lab), `Lab` (embedded instrument, `code={false}` for chapters), `Drill` (short round).
    Shorthand easing strings: `src/lib/spec.ts` (`--ease-out`, `spring(response .4 bounce .3)`, `spring.snappy`,
    `steps(6)`, `linear(…)`). Lab shorthand → state: `src/lib/labpresets.ts`.
  - `components/figures/Mock.svelte` — UI specimens (dot, card, modal, toast, menu, list, drawer, toggle, like, drop,
    expand, swap, tabs, badge, progress) animated with real WAAPI from a `MockMotion`.
  - Eye Trainer: `lib/drills/*` (DrillDef: make(rand, level) + score), `components/drills/*` (trial components,
    `DrillRunner` round/short, `Calibration` log-log scatter + error trend, `EyeTrainer` page component).
    All 9 drills are built (listed under "Built for M5–M8"). `/lab/eye-trainer` (+ `?drill=`). Results are
    `$state.raw`: a deep proxy holding a score's `meta` fails structured clone and never reaches IndexedDB.

## Decisions

- **No tests** (user instruction, 2026-09-29): no Vitest suites, no Playwright snapshots. Verification is by looking in the
  browser (`scripts/shoot.mjs`) and throwaway scratch checks. Core math was checked once against references
  (ease(0.5)=0.8024; closed-form springs match RK4 to 1e-11; linear() round-trip < tolerance). `pnpm test` does not exist.
- **pnpm only** (user instruction).
- Astro **5.18.2** (curriculum says Astro 5; latest is 7), `@astrojs/svelte` 7.2.5, `@astrojs/mdx` 4.3.14, Svelte 5.57, TypeScript 5.9.
- pnpm 11 uses `allowBuilds` in `pnpm-workspace.yaml` (esbuild on, sharp off — no image optimisation needed).
- Packages export TS source (`exports: ./src/index.ts`); their `build` is a `tsc --noEmit` typecheck.
- Added tokens beyond §1.6 (logged, all in tokens.json): `--paper-raised`, `--graphite-strong` (secondary *text* that must pass
  contrast; `--graphite` stays for axes/grids), exit durations (`--dur-*-exit` = 0.7×), distances (`rise 4`, `nudge 8`,
  `travel 24`), `--stagger-step: 30ms`, springs compiled to `--spring-*` + `--spring-*-dur`.
- Reduced motion policy = "reduce, don't remove": distance tokens drop to 0 (rises become fades), draw-ins/springs stop;
  figures render their onion skin still. User override via View popover (`data-motion="reduce|full"` on `<html>`).
- Page cut uses Astro `<ClientRouter />` + `transition:animate={pageCut}` on `<main>`; header uses `transition:animate="none"`.
  `<main>` is named `page`; Astro's CSS sets every view-transition animation to `none` under reduced motion, so
  `motion.css` restores the dissolve there with a layered `!important` (reduce, don't remove).
- Phones: inline code may wrap anywhere; prose tables scroll inside themselves; `TimeBar` stacks by its own width
  (container query), so narrow Lab embeds and phones share one layout.
- Colours in code: numbers are blue pencil (the knobs, "what could be"); a changed token flashes red. Shiki uses the
  `css-variables` theme mapped to the pencil palette, so both themes work at zero JS.
- Dev toolbar disabled (it overlapped content).
- Svelte gotcha: never name a variable/prop `state` in a component that uses runes (`$state` becomes a store read).
  Instruments call their state `lab`; the shell prop is `snapshot`.
- `structuredClone` fails on `$state` proxies → codegen uses JSON clones.
- Sandbox iframe must be created with its srcdoc (keyed `{#key srcdoc}`); changing srcdoc during the initial
  about:blank load is dropped by Chromium. Harness starts its clock paused, waits two real frames, samples t=0,
  triggers `.is-on`, then plays.
- Code panel states: `synced` (doc == generated; knob changes diff+flash), `edited` (structure changed; knobs patch
  only bound tokens), `detached` (a binding was destroyed; code runs as written). Non-synced auto-switches the stage
  to the browser sandbox. Typing resyncs derived text after 900ms idle; dragging resyncs live.
- MDX gotcha: indentation inside inline template-literal props gets stripped. Put code in `export const x = \`…\``
  after the frontmatter and pass `source={x}`.
- Svelte 5 runs `onDestroy` during SSR: never touch `window`/listeners there; clean up in `onMount`'s return.
- Astro's css-variables Shiki theme uses `--astro-code-*` names (mapped in `styles/code.css`).
- Astro wrappers that spread props into Svelte islands use `const props = Astro.props as any` (astro check).
- FEEL comes before numbers: SEE figures in early chapters hide readouts (`readout={false}`) or use words as labels.
- Drills never autoplay under reduced motion; they wait for Play (user-initiated motion is allowed).
- "Spot the Principle" / "What does it say" clips are synthetic UI specimens (Mock), not recordings of real apps.
- The Frame Stepper steps same-origin pages only (browsers forbid touching another origin's clock); cross-origin URLs
  load view-only with a notice.
- `play()` (motion/primitives.ts) reads the element's computed style *before* cancelling the running animation, and
  only continues from it when the previous motion hasn't been cancelled (found while writing ch 24).
- Data Stage marks are keyed by datum id when bars are matched by key, by slot when matched by position; a change
  mid-move starts from the bars' current geometry (`datastage.ts` `snapshot()`), so it retargets instead of snapping.
- A stage is a window: `.instrument > .i-stage` and `SandboxStage` clip what they draw (`.fig svg` is `overflow:
  visible`, so an unclipped ghost overlay once painted across the code column).
- Figure marks ignore the pointer only inside the drawing: `.fig svg :is(.grid, .ax, .label, .ghost, …)`. Unscoped,
  `.fig .ghost` caught `.btn.ghost` and made every Still toggle unclickable. Likewise the page frame's rule is
  `.frame > .scroller`, so a component may use the class name.
- Controls animate site-wide without per-component code: segmented controls (motion/controls.ts), checkboxes (drawn
  tick) and ranges (bead swells on hover/hold, blue focus ring) are styled globally in components.css.
- Shared marks: `ui/PencilArrow.astro` (the lab grid's arrow; ink at rest, redrawn in blue pencil on a
  `.pencil-hover`'s hover) and `ui/ReplayIcon.svelte` (anticlockwise circle; drawn over on hover, turns on press).
- The footer ruler's loop plays only while it is on screen (boot.ts `wireFootRule`): an endless custom-property
  animation cost a style pass every frame, against ch 20/21.
- Print: the frame lets go and the page flows onto paper (grid.css), every reveal shows its end state (motion.css),
  and colours are always the light theme (emitted by build-tokens.mjs).
- Export Desk tokens follow the W3C Design Tokens format 2025.10 (durations `{ value, unit }`, `cubicBezier` arrays;
  a spring is a `number` group with its `linear()` in `$extensions`).
- Codegen: GSAP and Canvas emit a CSS-exact `steps(n, position)` helper (GSAP's own `steps(n)` has n+1 levels);
  `linear()` stops use a `linearEase` helper in Motion/GSAP/Canvas; the Canvas spring steps at a fixed 1ms.
- The sandbox registers CSS/WAAPI animations before time advances (they used to start a frame late); the Frame
  Stepper's CSS ⇄ JS switch translates the reader's code (`lib/sandbox/translate.ts`) rather than swapping in a demo.
- Dev server gotcha: Vite can keep serving a stale `<style>` block for an `.astro` component after full reloads;
  `touch` the file to invalidate it.
- `pnpm build` runs the motion lint first, so a raw duration or curve in an app style fails the build.

## Deviations from CURRICULUM.md

- **No automated tests or visual snapshots** (user instruction). Verification was by eye in Chromium, plus throwaway
  scripts in the git-ignored `scripts/dev/`.
- **Synthetic clips for "real UI" drills.** What It Says, Spot the Principle and Blind A/B play specimens built from
  real WAAPI on mock UI (and canvas clips), not recordings of shipping apps: no licensing, and every clip is exact.
- **Frame Stepper URLs are same-origin only.** Browsers don't allow another origin's clock to be patched.
- **Variant instrument layouts.** L8 Journal and L9 Export Desk have their own page layouts rather than the
  params | stage | time | code shell: neither edits a single scene. L10 Data Stage uses the shell, but its code
  column is generated and read-only. The two-way code panel is on L1–L4; L5 and L7 are code-first editors (the
  code drives the stage; numbers can be dragged).
- **Extra tokens** beyond §1.6 (listed under Decisions), all in `tokens.json`.
- **The page cut spends `--dur-base`, not `--dur-scene`**, following the frequency rule (you turn pages often);
  chapter 22 says so.

## Known issues / gaps

- Blind A/B, Spot the Principle and What It Says use synthetic UI specimens (`Mock`, canvas clips), not recordings of real apps.
- The Frame Stepper steps same-origin pages only; other origins load view-only with a notice.
- The sandbox's virtual clock caps a frame's `dt` at 50ms, so code there can't observe a longer frame.
- `<FeelAB>` hosts UI mocks only (no canvas programs); canvas FEELs are two `<Canvas>` figures with a prose reveal.
- `<Canvas>` programs passed as raw `source` get no knobs (only registered programs have params).
- L9 Export Desk converts one move at a time; it has no whole-token-set import.
- L1 Spacing Chart scales every distance to fill its track, so distance changes are read in the numbers, not the drawing.
- Physics chapter: `integrators` has no RK4 row (RK4 is taught in prose and a table).
- Full-page screenshots (`shoot.mjs --full`) can catch sandbox iframes and IndexedDB-backed panels before they draw;
  element screenshots after scrolling them into view show them correctly.

## Verification helpers (not tests)

`scripts/dev/` is git-ignored scratch: `overflow.mjs` (lists elements wider than a 375px viewport), `figs.mjs`
(screenshots every `<figure>` on a page), `embed.mjs` (the first Lab embed), `cp.mjs` (drives the code panel),
`drill.mjs` (plays drills and checks IndexedDB). Used by eye, not asserted.

## Audit pass (2026-09-30)

Every chapter, instrument, drill and control was reviewed for correctness (facts, maths, code, prose vs figure vs lab
state) and smoothness (loop seams, interruption, Still, dark, reduced motion, phone), by six parallel reviewers each
owning a set of files, then merged by the lead. Every snippet's code was parsed or run; every "Open in Lab" state was
decoded and matched to its code; every codegen dialect was run in the sandbox and measured against the model (within
0.4%). Their throwaway scripts are `scripts/dev/g*-*.mjs`, `lab-*.mts`, `lead-*.mjs`.

## Workflow for chapters

Chapters were written by parallel subagents following `docs/CHAPTER_KIT.md`, one file each, no commits; each report
was reviewed (facts, code, DoD, screenshots) and the kit gaps they found were fixed before the milestone commit.

## Built for M5–M8
- L4 `ExposureSheet` (+ `XSheet`, `ChoreoStage`, `ChoreoFigure` → `<Choreo>`), `<Principles>` (lib/principles.ts, 12
  canvas clips) + `spot-principle` drill, `<Flip>`, `<ViewTransition>` (real same-document VT), `<Spatial>`, `<Discrete>`
  (@starting-style + allow-discrete), Mock `origin`.
- M6: `<Drag>` (1:1, rubber-band, projection, spring with velocity), `<Scroll>` (real scroll-driven animations +
  scroll-jacked comparison), `<Medium>` (DOM transform vs left/top vs Canvas, measured fps), programs2.ts:
  loop-hz, smoothing-trap, integrators, collisions, particles, trails, boids, noise-vs-random, idle.
- L8 `SpecimenJournal` (vocabulary: per-word median duration / easing kind / ζ), L9 `ExportDesk` (5 dialects +
  W3C-style token JSON + spec sentence, paste any easing).
- All 9 drills built: what-it-says, guess-duration, match-curve, which-heavier, tune-to-match, blind-ab (topic
  filter), spot-principle, fix-feeling, transition-lies.
- L10 `DataStage` (+ `lib/datastage.ts`: sample data, 5 states, keying data|index, staging together|staged,
  per-mark geometry over time; `DataChart` SVG/Canvas; tracked datum in red), `<Pipeline>`, `<Count>`,
  `<Architecture>` (plays this app's real primitives/orchestration/patterns/policy).
- SandboxStage draws measured position + velocity graphs of user code (spec: "ghosts and graphs").
- Motion inspector verified (Alt-hover on a button lists property · ms · token · curve).
- Bug fixed: CanvasFigure still mode looped forever (effect tracked transport.time) → untrack + offline() no longer
  writes reactive state.

