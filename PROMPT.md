# Build Inbetween

## Goal

Build **Inbetween**, the web app specified in `CURRICULUM.md`: a course and lab for learning web animation through design intuition. Finish it end to end, milestones M0 → M8.

`CURRICULUM.md` is the single source of truth for the visual direction (§1), the lab instruments and code panel (§2), the chapters (§3), the Eye Trainer (§4), and the stack, repo shape, and milestones (§5). Read it fully before writing any code. If this prompt and the curriculum disagree, the curriculum wins.

## Done means

- All 25 chapters exist as MDX pages. Each one meets the **Definition of Done** in §5.3: live figure with a numbered caption, a FEEL moment before numbers, a pre-configured instrument, code snippets that open in the Lab, a reduced-motion version, a drill, and a margin reference.
- All 10 lab instruments (L1 to L10) work standalone at `/lab/<instrument>` and embedded in chapters.
- The code panel (§2.1) is fully two-way: knob ↔ code, draggable numbers, changed-token flash, line ↔ stage hover, tabs (CSS / WAAPI / Motion / GSAP / Canvas), and user code running in a sandboxed iframe with ghosts and graphs.
- The Eye Trainer has every drill in §4, with scores and a calibration graph persisted in IndexedDB.
- The special topics are complete: **23 Animated Infographics** (with L10 Data Stage) and **24 Motion Architecture**. The app's own motion system is built with the tokens → primitives → patterns → policy layers it teaches, so chapter 24 can use the codebase as its case study.
- Light (Paper) and dark (Lightbox) themes both work. The layout works at 375px wide. `prefers-reduced-motion` is honored everywhere.
- `pnpm build` passes. `pnpm test` passes (Vitest for `packages/core` and `packages/codegen`). Playwright visual snapshots exist for every figure and instrument.

## Standard: think like a visual director

- Follow §1 exactly: paper, graphite, and the blue/red pencil semantics; Instrument Serif / Inter / JetBrains Mono; the peg bar; figures with captions; marginalia; stillness by default.
- Every motion in the app uses the tokens in §1.6. No ad-hoc durations or curves anywhere. Grep for stray `ms` and `cubic-bezier` values before finishing a milestone.
- The index page should feel like a calm, numbered textbook (algebrica.org is the reference), with live motion specimens on hover.
- Taste over quantity. A figure that teaches one idea clearly beats three that decorate.
- Content voice: simple and clear, no filler prose. Short sentences, concrete examples.

## How to work

1. Work in `/home/izebb/Workspace/animations`. Run `git init` if needed and scaffold the monorepo from §5.1: `apps/web`, `packages/core`, `packages/codegen`, `packages/editor`.
2. Go milestone by milestone (§5.2). Within each milestone, build the core logic first, then instruments, then chapter content.
3. `packages/core` is written from scratch: cubic-bezier solver, spring solver (both stiffness/damping/mass and response/bounce), decay, `linear()` generator, and an rAF loop with `dt`. Test it against known values before any UI depends on it.
4. After each milestone:
   - Run `pnpm build` and `pnpm test`.
   - Run the dev server and **look at the result in a browser** (use the Chrome / browser skill). Screenshot the key pages in both themes and at mobile width, and fix what looks wrong. Judge the motion by stepping it with the Frame Stepper.
   - Commit with a message naming the milestone.
   - Update `PROGRESS.md`: what's done, what's next, decisions made, and known issues.
5. Keep `PROGRESS.md` current enough that a fresh session could resume from it alone. **On start, read `PROGRESS.md` if it exists and continue from where it left off.**
6. Make reasonable decisions yourself and log them in `PROGRESS.md`. Don't stop to ask unless something is truly blocked (for example, missing credentials). Deployment to Cloudflare is out of scope. Just leave the build deploy-ready.
7. Use subagents to parallelize independent chapter content once the instruments and the MDX figure components exist. Review their output against §1 and §5.3 before committing.

## Final report

When M8 is done, report:
- what was built
- how to run it
- screenshots of the index, one chapter, the lab, and the Eye Trainer
- deviations from `CURRICULUM.md` and why
- known gaps
