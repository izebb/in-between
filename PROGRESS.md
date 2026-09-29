# Inbetween — build progress

Source of truth: `CURRICULUM.md`. Task brief: `PROMPT.md`. This file is enough to resume from.

## Status

| # | Milestone | State |
|---|---|---|
| M0 | Design system | ✅ done |
| M1 | Motion core | ✅ done |
| M2 | First instruments (L1, L2, L5, Code Panel) | ✅ done |
| M3 | Part I live (ch 01–03 + 2 drills) | ✅ done |
| M4 | Physics (L3, L7, ch 04–06) | ⏳ next |
| M5 | Choreography (L4, ch 07–11) | — |
| M6 | Interaction + Canvas (ch 12–19) | — |
| M7 | Craft + Journal (L8, L9, ch 20–22, calibration graph) | — |
| M8 | Special Topics (L10, ch 23–25) | — |

## How to run

```sh
pnpm install
pnpm dev          # http://localhost:4321  (compiles tokens + copies vendor bundles first)
pnpm build        # packages typecheck, then astro check + astro build → apps/web/dist
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
    contract). `inspector.ts` = hold Alt over anything that moves. `boot.ts` runs per page.
  - `src/styles/` — `index.css` declares layer order: reset, tokens, base, type, layout, components, code, figures, lab, motion, utilities.
  - `src/lib/curriculum.ts` — outline: parts, 25 chapters (slug, summary, specimen, instruments, drill), 10 instruments.
  - `src/lib/specimens.ts` — index hover specimens (canvas; still = onion skin, hover = plays).
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
    Built so far: what-it-says (ch 01), guess-duration, match-curve. `/lab/eye-trainer` (+ `?drill=`).

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

## Known issues / todo

- Chapters show "in preparation" on the index until their MDX exists.

## Verification helpers (not committed tests)

`scripts/dev/` is git-ignored scratch: `cp.mjs` drives the code panel (knob→code flash, type→knob, drag→knob,
tab switch, stage hover→lines). Last run: all pass.

`drill.mjs` plays drills in ch 02/03 and checks the Eye Trainer stored the session. Last run: pass.

## Next (M4)

1. L3 Spring Bench (k/c/m ↔ response/bounce, live graph, settle time, CSS linear() export) + `SpringPlot` figure.
2. L7 Canvas Sandbox (code-first, update(dt)/draw(ctx) scaffold, dt/fps readouts, pause/step, hot reload keeps state)
   + `CanvasFigure` with a program registry (bouncing ball, flick/decay, …).
3. Drills: which-heavier, tune-to-match, blind-ab.
4. Write `docs/CHAPTER_KIT.md` (authoring guide for subagents), then chapters 04–06.
