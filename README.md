# Inbetween

**A field manual and laboratory for motion on the web.** Twenty-five chapters that teach web animation through design
intuition (See → Feel → Tune → Write → Drill), a bench of ten lab instruments, and an Eye Trainer with scored
perception drills and a calibration graph.

The full specification is [`CURRICULUM.md`](CURRICULUM.md). Build notes, decisions and known issues are in
[`PROGRESS.md`](PROGRESS.md). How chapters are written: [`docs/CHAPTER_KIT.md`](docs/CHAPTER_KIT.md).

## Run it

```sh
pnpm install
pnpm dev            # http://localhost:4321
pnpm build          # typechecks the packages, then astro check + astro build → apps/web/dist (static)
pnpm preview        # serve the build
pnpm lint:motion    # fails on any raw duration or curve outside the motion tokens
```

Requires Node 22.18+ (the token script runs the TypeScript core directly) and pnpm 11. The build is fully static (deploy `apps/web/dist` to any static host, e.g. Cloudflare Pages).

## Where things are

| Path | What |
|---|---|
| `packages/core` | Motion maths, zero dependencies: cubic-bézier solver, springs (k/c/m and response/bounce), decay, `linear()` generation, rAF loop with `dt`, playhead, integrators, noise |
| `packages/codegen` | One motion scene → CSS, WAAPI, Motion, GSAP and Canvas code, with every number bound to a parameter |
| `packages/editor` | CodeMirror 6 extensions: bound parameters, draggable numbers, changed-token flash, line ↔ stage links |
| `apps/web/src/motion` | The site's own motion system: `tokens.json` → primitives → orchestration → patterns → policy, plus the Alt-hover inspector |
| `apps/web/src/components/lab` | The instruments (L1–L10) and the two-way code panel |
| `apps/web/src/components/figures` | Chapter figures |
| `apps/web/src/components/drills` | The Eye Trainer |
| `apps/web/src/lib/sandbox` | The virtual clock and sandboxed stage that runs, steps and measures any code |
| `apps/web/src/content/chapters` | The 25 chapters (MDX) |

## Pages

- `/` — contents, with a live specimen per chapter on hover
- `/chapters/<slug>` — chapters
- `/lab` and `/lab/<instrument>` — spacing-chart, curve-bench, spring-bench, exposure-sheet, frame-stepper,
  canvas-sandbox, specimen-journal, export-desk, data-stage
- `/lab/eye-trainer` — the drills and your calibration graph
- `/system` — the specimen sheet: every token and primitive, live
