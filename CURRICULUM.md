# Inbetween

**A field manual and laboratory for motion on the web.**

> *"Animation is not the art of drawings that move, but the art of movements that are drawn."* (Norman McLaren)

In animation, an *inbetween* is a frame drawn between two keys. The course lives in that gap: between design and code, between the start state and the end state, between copying a value and knowing why it's right.

---

## 0. Thesis

- Motion is **information** first and decoration second.
- **Timing** (how long) and **spacing** (how far per frame) are the two things to learn. Everything else combines them.
- Code is notation, the way sheet music is. Learn to hear the music first, then learn to write it down.
- Intuition comes from **perception drills**, not from reading. The course trains your eye the way ear training trains a musician.
- Every concept is taught in the same four beats: **See → Feel → Tune → Write.**

---

## 1. Visual Direction

### 1.1 The Concept: *The Animator's Desk*

The app is a meeting of two objects:

| Object | What we take from it |
|---|---|
| **The math textbook** (algebrica.org) | Numbered chapters, rigorous calm, figures with captions, marginalia, lots of white space, trust |
| **The animator's lightbox** | Onion skins, exposure sheets, blue-pencil roughs, red-pencil keys, peg holes, frame counters |

The result feels like a quiet scientific journal where the figures are alive.

### 1.2 Principles

1. **Stillness is the canvas.** The interface is almost completely static. That way, whenever something moves, it means something. The page never animates for decoration.
2. **The site practises what it teaches.** Every UI transition in the app is a worked example. Hold a modifier key on any animated element to inspect its curve, duration, and spring.
3. **Show the invisible.** Motion is time, and time can't be seen directly, so we make it visible with ghosts, ticks, graphs, and trails. The signature visual of the brand is the **onion skin**.
4. **Figures, not illustrations.** Every image is a live diagram built from real data, with a figure number and caption: *Fig. 2.3: Ease-out, 12 frames, spacing chart.*
5. **One hand, one pencil.** A restrained system: two typefaces, one ink, one accent. Complexity lives in the motion, not in the chrome.

### 1.3 Color: *Paper, Graphite, and Two Pencils*

Animators rough in **blue pencil** and commit keys in **red pencil**. That becomes our semantic color system.

| Token | Light (Paper) | Dark (Lightbox) | Meaning |
|---|---|---|---|
| `--paper` | `#F5F3EE` warm paper | `#0E0F11` desk at night | background |
| `--ink` | `#16161A` | `#ECEAE4` | text, primary strokes |
| `--graphite` | `#8A8880` | `#6B6A66` | secondary text, grid, axes |
| `--rule` | `#E2DED5` | `#1F2024` | hairlines, peg-bar lines |
| `--blue-pencil` | `#3D6BFF` | `#7C9BFF` | ghosts, paths, rough, "what could be" |
| `--red-pencil` | `#FF3B1F` | `#FF5A3C` | keys, current frame, "what is" |
| `--glow` | n/a | `rgba(255,248,230,.06)` | lightbox glow under figures in dark mode |

Rules:
- Red appears **only** on something that is moving or is a key. Never on buttons or decoration.
- Blue appears **only** for time that has passed or is about to happen (ghosts, trajectories, curve handles).
- Dark mode is not an inverted theme. It's the **lightbox**: figures sit on a faint glowing plate, as if lit from below.

### 1.4 Typography

| Role | Face | Why |
|---|---|---|
| Display / chapter titles | **Instrument Serif** (or Newsreader) | Book-like and editorial. Italic for emphasis, like a margin note |
| Body / UI | **Inter** or **Geist** | Neutral, readable, stays out of the way |
| Numbers, parameters, code | **JetBrains Mono** or **Berkeley Mono** | Frame counts, ms, and curve values are *data* and should look like measurements |

- Tabular numerals everywhere a number changes live (scrubbers, readouts).
- Chapter numbers set large in serif: **02** Spacing.
- Captions in small caps mono: `FIG. 2.3 — EASE-OUT, 12 FR`.

### 1.5 Layout and Grid

- A 12-column grid with a **peg bar**: a thin top rule with three small holes, echoing the animation registration bar. It's the one piece of ornament we allow.
- The reading column is about 64ch. **Marginalia** sit in a right rail for definitions, historical notes, and "in the wild" references.
- Figures break out of the text column to full width, like plates in a book.
- The index page is a numbered table of contents, algebrica style. Each chapter row shows a tiny live **motion specimen** (a looping 1-second sample of the chapter's idea) on hover.
- The lab is a separate **full-bleed workspace**: instrument panel on the left, stage in the center, graphs underneath. Reading mode and lab mode are two distinct postures.

### 1.6 The App's Own Motion Language

The app has its own motion tokens, and they are taught in Chapter 12 as a case study.

| Token | Value | Used for |
|---|---|---|
| `--dur-instant` | 90ms | press states, toggles |
| `--dur-quick` | 180ms | hovers, small reveals |
| `--dur-base` | 280ms | panels, cards |
| `--dur-scene` | 480ms | page and chapter transitions |
| `--ease-out` | `cubic-bezier(.2,.8,.2,1)` | enter |
| `--ease-in` | `cubic-bezier(.4,0,1,1)` | exit (exits are faster: ~0.7× enter) |
| `--ease-inout` | `cubic-bezier(.65,0,.35,1)` | on-screen moves |
| `spring.snappy` | response .3, bounce 0 | direct manipulation |
| `spring.soft` | response .5, bounce .15 | playful confirmations |

Signature moments:
- **Page turn = a cut, not a slide.** Chapters change with a quick cross-dissolve and a 4px rise. It's calm and bookish.
- **Figure reveal = drawn in.** As a figure scrolls into view, its axes stroke-draw first, then the ghosts appear, then the red key lands. That's staging in action.
- **Hover on any figure** shows its onion skin: the frames it will pass through, in blue.
- **Scrubbing** anywhere uses a real spring with velocity carry-over, so it feels like a physical dial.
- `prefers-reduced-motion`: ghosts stay, movement stops. The figures become static spacing charts, which are still fully informative. Nothing is lost, only the playback.

### 1.7 Sound (optional, off by default)

A soft tick on each frame when stepping frame by frame, like a film counter. It makes the frame grid audible.

---

## 2. The Lab: Instruments

The lab is a bench of instruments. Every lesson opens one or more of them pre-configured.

| # | Instrument | What it does | What it trains |
|---|---|---|---|
| L1 | **Spacing Chart** | Draws an object's positions per frame as onion-skin ghosts plus an animator's tick chart | Seeing spacing = seeing easing |
| L2 | **Curve Bench** | Cubic-bezier editor with a **position graph** and a **velocity graph** side by side, plus A/B compare | Reading a curve as speed |
| L3 | **Spring Bench** | Stiffness / damping / mass, *or* response / bounce (Apple model). Live graph, settle time, export to CSS `linear()` | Physics as feel |
| L4 | **Exposure Sheet** | Multi-track timeline for keyframes, offsets, and staggers across several elements | Choreography, overlap |
| L5 | **Frame Stepper** | Plays anything at 1× / 0.25× / 0.1× or steps frame by frame. Works on lab stages and on pasted URLs via iframe | Observation |
| L6 | **Eye Trainer** | Perception drills (see §4) | Intuition, measured |
| L7 | **Canvas Sandbox** | Live-code canvas with the rAF loop scaffolded, `dt` / fps readouts, pause and step | Motion from scratch |
| L8 | **Specimen Journal** | Save any lab state with feeling-words (*snappy, heavy, nervous…*). Builds your personal motion vocabulary | Taste |
| L9 | **Export Desk** | Converts any lab state into CSS, the Web Animations API, Motion (framer), GSAP, or Canvas code | Notation |
| L10 | **Data Stage** | A dataset + chart that transitions between states (sort, filter, regroup). Swap interpolation, stagger, and staging; toggle SVG/Canvas | Motion that explains |

Every instrument shares the same UI grammar: **parameters on the left, stage in the center, time underneath, code on the right.**

### 2.1 The Code Panel: Code as a Live Instrument

Every instrument has a code panel. It isn't a static snippet. It's another view of the same state.

```
┌──────────────┬──────────────────────────┬──────────────────┐
│  PARAMETERS  │          STAGE           │       CODE       │
│  knobs,      │   the moving object +    │  CSS │ WAAPI │   │
│  sliders     │   onion-skin ghosts      │  Motion │ Canvas │
│              │                          │  (editable)      │
├──────────────┴──────────────────────────┴──────────────────┤
│  TIME: scrubber · frame counter · position/velocity graph  │
└────────────────────────────────────────────────────────────┘
```

- **Two-way binding.** Turning a knob rewrites the code, and editing the code moves the knobs. The number `0.8` in `cubic-bezier(.2,.8,.2,1)` is draggable in place: scrub it horizontally like a slider.
- **Diff highlight.** When a knob changes, the changed token in the code flashes briefly in red pencil. You see exactly which characters a feeling lives in.
- **Tabs = dialects.** The same motion written as CSS, WAAPI, Motion, GSAP, or Canvas. Switching tabs animates the shared tokens across (they're the same numbers in different notation).
- **Annotated lines.** Hovering a line highlights what it controls on the stage, and hovering on the stage highlights the line.
- **Run your own.** Paste or write code in the panel. It runs in a sandboxed stage and gets the same ghosts and graphs. Any motion you write becomes measurable.
- **Snippet cards in chapters.** Each lesson ends with 1 to 3 copyable snippets. Each one links back to "Open in Lab" with that exact state loaded.
- **Canvas Sandbox (L7)** is code-first: editor on the left, canvas on the right. `update(dt)` / `draw(ctx)` are pre-scaffolded, with hot reload that keeps state.

Snippet format in the curriculum:

```css
/* 03 · Spacing: arrive and settle */
.card-enter {
  transition: transform 280ms cubic-bezier(.2, .8, .2, 1),
              opacity   180ms linear;
}
```

```js
// 16 · Physics by Hand: a spring in 6 lines
function step(s, target, dt, k = 170, c = 26, m = 1) {
  const force = -k * (s.x - target) - c * s.v;
  s.v += (force / m) * dt;   // semi-implicit Euler:
  s.x += s.v * dt;           // velocity first, then position
  return s;
}
```

---

## 3. Curriculum

Each lesson follows the same shape:

```
SEE    a live figure demonstrating the idea
FEEL   a toggle or A/B that you judge with your eyes, not numbers
TUNE   a lab instrument where you change one variable at a time
WRITE  the code, revealed last, as notation for what you already felt
DRILL  a short Eye Trainer round to lock it in
```

### Part I: Seeing

**01 · Motion Is Information**
- What motion tells us: causality, continuity, attention, feedback, state.
- Figure: the same UI change with and without motion. What did you lose?
- Drill: name what the motion *says* in 10 real UI clips.
- Tech: none. Observation only.

**02 · Timing**
- Duration as weight, mood, and importance.
- Frames vs. milliseconds. Why the web thinks in ms but you should *see* in frames.
- The 100 / 200 / 300 / 500ms bands and what each feels like.
- Distance and size change what "right" duration is.
- Lab: L1, L5. Drill: *Guess the duration.*
- Tech: `transition-duration`, `animation-duration`, the Animations panel in DevTools.

**03 · Spacing**
- The key idea of the course: **easing is spacing**.
- Linear, ease-in, ease-out, ease-in-out, drawn as spacing charts.
- Enter with ease-out, exit with ease-in, and the reason in the world (things arrive and settle, things leave and accelerate).
- Reading a cubic-bezier: the handles are velocity at the start and end.
- Lab: L1, L2. Drill: *Match the curve.*
- Tech: `cubic-bezier()`, `steps()`, `linear()` with stops.

### Part II: Physics

**04 · Weight**
- Heavy vs. light objects along the same path. Only timing and spacing change.
- The bouncing ball: gravity, contact, energy loss.
- Lab: L1, L7. Drill: *Which is heavier?*
- Tech: keyframes with per-segment easing.

**05 · Springs**
- Why durations are a lie and springs are a model.
- Stiffness, damping, mass → response and bounce (the designer's pair).
- Critically damped vs. underdamped: when a bounce is honest.
- Interruptibility: a spring keeps velocity, a tween restarts.
- Lab: L3. Drill: *Tune the spring to match.*
- Tech: Motion `spring`, CSS `linear()` generated from a spring, WAAPI.

**06 · Momentum and Friction**
- Flicks, inertia, deceleration rate (iOS scroll feel).
- Projecting the landing point from velocity.
- Lab: L3, L7. Tech: velocity tracking, exponential decay.

### Part III: The Principles, for Interfaces

**07 · The Twelve, Translated**
The 12 principles of *The Illusion of Life*, each with a UI example:

| Principle | UI form |
|---|---|
| Squash & stretch | press states, elastic overscroll |
| Anticipation | wind-up before a big move, hover-before-click |
| Staging | one thing moves at a time, direct the eye |
| Straight-ahead / pose-to-pose | procedural (canvas) vs. keyframed |
| Follow-through & overlap | children settle after parents |
| Slow in / slow out | easing (→ 03) |
| Arcs | curved paths for natural travel |
| Secondary action | an icon reacts while a panel moves |
| Timing | → 02 |
| Exaggeration | overshoot for delight, used sparingly |
| Solid drawing | depth: scale, shadow, perspective consistency |
| Appeal | personality, consistency, restraint |

- Lab: all. Drill: *Spot the principle.*
- Tech: `offset-path` for arcs, transform origin, 3D transforms.

### Part IV: Choreography

**08 · Stagger and Hierarchy**
- Who leads, who follows. Stagger as reading order.
- Small stagger values (20 to 40ms) and why more feels slow.
- Lab: L4. Tech: `animation-delay`, Motion `stagger`, CSS `sibling-index()`.

**09 · Enter, Exit, Change**
- Asymmetry: enters are generous, exits are quick.
- Where does it come from? Where does it go? Origin-aware transforms.
- Lab: L4, L2. Tech: `@starting-style`, `transition-behavior: allow-discrete`, exit animations.

### Part V: Continuity and Space

**10 · Object Permanence**
- The same thing, a new place: shared elements.
- FLIP by hand, then the platform version.
- Lab: L4, L5. Tech: FLIP, **View Transitions API** (same-document and cross-document), Motion `layout`.

**11 · Spatial Models**
- The app as a place: depth, direction, and back vs. forward.
- Z-axis for hierarchy, x-axis for sequence.
- Tech: view transition classes, 3D perspective.

### Part VI: Interaction

**12 · Direct Manipulation**
- 1:1 tracking, rubber-banding, release with velocity.
- Interruptible everything.
- Lab: L3, L7. Tech: Pointer Events, pointer capture, springs with initial velocity.

**13 · Scroll as Time**
- Scroll as a scrubber: when that's good, and when it's hijacking.
- Lab: L4. Tech: **scroll-driven animations** (`animation-timeline: scroll()` / `view()`), IntersectionObserver.

### Part VII: The Canvas

The DOM animates *properties*. The canvas animates *pixels*. Here you build motion from nothing, one frame at a time, which is the closest the web gets to hand-drawn animation.

**14 · The Loop**
- Canvas as a flipbook: clear, draw, repeat.
- `requestAnimationFrame`, and time-based vs. frame-based motion (`dt`).
- High-DPI setup (`devicePixelRatio`), resize.
- Lab: L7. Figure: the same motion at 30 / 60 / 120Hz. Only `dt`-based code survives.

**15 · Easing by Hand**
- `lerp`, `t` mapping, writing your own easing functions.
- Exponential smoothing (`x += (target - x) * k`) and its frame-rate trap, plus the correct `1 - exp(-λ·dt)` form.
- Tech: pure math, no libraries.

**16 · Physics by Hand**
- Position, velocity, acceleration. Euler vs. semi-implicit Euler vs. Verlet.
- Build a spring from scratch, and see that it matches L3.
- Gravity, collisions, bounce, friction.

**17 · Many Things**
- Particles: emit, live, die.
- Trails and motion blur via translucent clears.
- Flocking (boids): emergent choreography.

**18 · Organic Motion**
- Noise (Perlin / simplex) vs. random: why nature is *smooth* randomness.
- Breathing, idling, wobble: secondary motion that never loops obviously.

**19 · Choosing the Medium**

| Medium | Best for | Cost |
|---|---|---|
| CSS | UI state changes, hovers, enters/exits | cheapest, declarative |
| WAAPI | JS-controlled timelines, scrubbing | low |
| SVG | line drawing, morphing shapes, crisp diagrams | medium at scale |
| Canvas 2D | many objects, particles, procedural, generative | you own everything |
| WebGL / WebGPU | thousands of things, shaders, 3D | highest complexity |

- Performance: OffscreenCanvas, batching, avoiding garbage per frame.

### Part VIII: Craft

**20 · Performance**
- The rendering pipeline: style → layout → paint → composite.
- Compositor-only properties (`transform`, `opacity`), `will-change`, layers.
- 120Hz displays, frame budgets, measuring jank in DevTools.

**21 · Care**
- Vestibular disorders and `prefers-reduced-motion`: reduce, don't remove.
- Motion that respects focus, attention, and battery.
- Never block the user with animation.

**22 · Taste**
- Frequency rule: the more often something is seen, the less it should move.
- Personality: the same interaction built three ways (calm, playful, precise).
- When *not* to animate.
- Case study: this app's own motion tokens (§1.6).
- Critique protocol: **feeling-word → cause → parameter → change one thing.**

### Part IX: Special Topics

**23 · Animated Infographics**
Here motion explains data. It isn't there for decoration.
- **Object constancy:** the same datum stays the same mark across states. The bar for "2024" moves; it's never replaced.
- **Transitions between data states:** interpolating values, shapes, and paths. Why you interpolate *data*, not pixels.
- **Staged reveal:** axes, then marks, then annotation, then the insight. Timing is the argument.
- **Counting and morphing numbers:** tabular numerals, rolling digits, when counting up helps and when it's theatre.
- **Annotation timing:** the eye arrives after the motion stops. Place labels on the settle, not during travel.
- **Scrollytelling:** scroll-driven chapters of a chart and pacing a narrative.
- **Honesty:** motion must not distort magnitude. Easing on bar heights, overshoot on values, and 3D rotation all bias perception.
- **Canvas vs. SVG for data:** marks count, hit-testing, crispness.
- Lab: L10 Data Stage. Drill: *Which transition lies?*
- Tech: `d3-scale`, `d3-shape`, `d3-interpolate` (maths only, no D3 DOM), SVG path morphing, Canvas for >1k marks, scroll-driven animations.

**24 · Motion Architecture**
Designing animation as a *system* rather than a pile of one-off effects.
- **Layers of a motion system:**

| Layer | Contains | Example |
|---|---|---|
| Tokens | durations, curves, springs, distances | `--dur-base`, `spring.snappy` |
| Primitives | reusable single motions | `fade`, `rise`, `scaleIn`, `collapse` |
| Patterns | composed choreography | `listEnter`, `modalOpen`, `sharedCardToDetail` |
| Orchestration | timing between components | stagger groups, sequences, `onSettle` hooks |
| Policy | global rules | reduced-motion strategy, frequency budget, interruption rules |

- **Where motion lives:** CSS for state, JS for choreography and physics, Canvas for procedural. Clear ownership avoids fights between CSS and JS.
- **Motion as state:** animations as transitions of a state machine. Enter / exit / change, plus interruption rules (reverse, retarget, or queue).
- **Interruption contract:** every motion declares what happens if it's interrupted.
- **Choreography API design:** declarative (`data-motion="rise"`) vs. imperative (`timeline()`), and trade-offs.
- **Design ↔ code handoff:** motion specs designers can write and engineers can read (token names, spacing charts, spring params). A single source of truth: one JSON token file compiles to CSS variables, TS, and Figma variables.
- **Testing motion:** deterministic clocks, snapshotting frames, asserting settle states, reduced-motion snapshots.
- **Performance budgets:** max concurrent animations, compositor-only rules, 120Hz budgets.
- **Documenting motion:** a living motion catalog (a Storybook-like "specimen sheet").
- Case study: the Inbetween codebase itself, walking through `tokens.css → packages/core → patterns → pages`.
- Lab: L4, L9. Exercise: refactor a messy page of ad-hoc animations into tokens + primitives + patterns.

### Capstone

**25 · Your Motion System**
- Architect it using the layers from 24: tokens → primitives → patterns → policy, for a product personality of your choice.
- Build one screen: an enter, an exit, a shared-element transition, one gesture, one canvas moment, and one animated infographic.
- Publish it with its spacing charts: your own figures, captioned.

---

## 4. Eye Trainer: The Intuition Engine

Ear training for the eyes. Short rounds (60 to 90s), scored, with streaks. These drills are what turn knowledge into instinct.

| Drill | Prompt | Unlocks after |
|---|---|---|
| **Guess the Duration** | Watch a move. Estimate its ms. Score = error. | 02 |
| **Match the Curve** | Watch a motion, pick its curve from 4 | 03 |
| **Which Is Heavier?** | Two objects, same path. Choose. | 04 |
| **Tune to Match** | Target spring plays. Match it with two knobs. | 05 |
| **Spot the Principle** | Clip from a real UI. Name the principle. | 07 |
| **Fix the Feeling** | A broken animation plus a feeling-word ("floaty"). Fix it in one change. | 22 |
| **Which Transition Lies?** | Two chart transitions of the same data. Pick the one that distorts. | 23 |
| **Blind A/B** | Two versions. Pick the better one, then explain why in one word. | any |

Progress is shown as a **calibration graph**: your estimates vs. the truth over time. The line tightening toward the diagonal is the visible proof that your intuition is forming.

---

## 5. Build Plan

### 5.1 Stack (decided)

| Layer | Choice | Why |
|---|---|---|
| Site / routing | **Astro 5** | Content-first and static by default. Chapters ship almost no JS, so the stillness comes for free |
| Chapters | **MDX** | Prose with live figures embedded inline: `<SpacingChart curve="ease-out" frames={12} />` |
| Interactive islands | **Svelte 5** (runes) | Fine-grained reactivity fits knob → stage → code at 60fps. Tiny runtime, no virtual-DOM cost in the render loop |
| Language | **TypeScript** | Everywhere |
| Motion core | **In-house `@inbetween/core`** | cubic-bezier solver, spring solver, `linear()` generator, decay, rAF loop with `dt`. Zero dependencies. Building it is part of the curriculum |
| Canvas | **Canvas 2D, native** | No wrapper. Students see real `ctx` calls. OffscreenCanvas + worker for particle-heavy figures |
| Code editor | **CodeMirror 6** | Lightweight and extensible. Custom extensions for draggable numbers, token flash, and line ↔ stage hover |
| Static highlighting | **Shiki** | Build-time, zero JS, custom theme using the pencil palette |
| Code execution | **Sandboxed `<iframe srcdoc>`** + `postMessage` | Runs user code safely. It reports frames back to the host, which draws ghosts and graphs |
| Styling | **Hand-written CSS** with custom properties and `@layer` | The tokens *are* the design (§1.3 to 1.6). No utility framework between us and the values |
| Page transitions | **View Transitions API** (Astro `<ClientRouter />`) | The app's own chapter "cuts", which are also a lesson (ch. 10) |
| Comparisons / export | **Motion**, **GSAP** | Loaded only in the Export Desk and comparison figures |
| Storage | **IndexedDB** (via `idb-keyval`) | Journal, drill scores, calibration history. Local-first, no accounts at v1 |
| Fonts | Instrument Serif, Inter, JetBrains Mono, self-hosted | No layout shift, no third-party calls |
| Hosting | **Cloudflare Pages** | Static and fast, with previews per branch |
| Tooling | **pnpm**, **Vitest** (core math), **Playwright** (visual snapshots of figures) | The core's curves and springs are tested against known values |

Repo shape:

```
inbetween/
├─ apps/web/                 Astro site
│  ├─ src/content/chapters/  01-motion-is-information.mdx …
│  ├─ src/components/figures/  SpacingChart.svelte, CurvePlot.svelte …
│  ├─ src/components/lab/      CurveBench.svelte, SpringBench.svelte, CodePanel.svelte …
│  └─ src/styles/            tokens.css, type.css, grid.css, motion.css
└─ packages/
   ├─ core/                  easing, bezier, spring, decay, loop (pure TS)
   ├─ codegen/               lab state → CSS / WAAPI / Motion / GSAP / Canvas
   └─ editor/                CodeMirror extensions (drag-number, flash, link-hover)
```

### 5.2 Milestones

| # | Milestone | Contents |
|---|---|---|
| M0 | **Design system** | Tokens (§1.3 to 1.6), type, grid, peg bar, figure + caption component, light/lightbox themes |
| M1 | **Motion core** | easing, cubic-bezier solver, spring solver, `linear()` export, loop with `dt` |
| M2 | **First instruments** | L1 Spacing Chart, L2 Curve Bench, L5 Frame Stepper, Code Panel (§2.1) with CSS + WAAPI tabs |
| M3 | **Part I live** | Chapters 01 to 03, plus the Guess the Duration and Match the Curve drills |
| M4 | **Physics** | L3 Spring Bench, L7 Canvas Sandbox, chapters 04 to 06 |
| M5 | **Choreography** | L4 Exposure Sheet, chapters 07 to 11 |
| M6 | **Interaction + Canvas** | chapters 12 to 19 |
| M7 | **Craft + Journal** | L8, L9, chapters 20 to 22, calibration graph |
| M8 | **Special Topics** | L10 Data Stage, chapters 23 (Infographics) and 24 (Motion Architecture), capstone 25 |

### 5.3 Definition of Done (every lesson)

- [ ] One live figure with a numbered caption
- [ ] One FEEL moment (A/B or toggle) before any number is shown
- [ ] One instrument, pre-configured
- [ ] Code shown last, in CSS **and** one JS form, as snippet cards that open in the Lab
- [ ] A reduced-motion version that still teaches
- [ ] One drill
- [ ] One "in the wild" reference in the margin

---

## 6. Reading List (for the margins)

- *The Illusion of Life*, Frank Thomas & Ollie Johnston
- *The Animator's Survival Kit*, Richard Williams
- WWDC: *Designing Fluid Interfaces* (2018), *Animate with Springs* (2023)
- *Designing Interface Animation*, Val Head
- *Animation at Work*, Rachel Nabors
- *Invisible Details of Interaction Design*, Rauno Freiberg
- animations.dev, Emil Kowalski · joshwcomeau.com
- *Stop Drawing Dead Fish*, Bret Victor
- *The Nature of Code*, Daniel Shiffman (the canvas and physics chapters)
