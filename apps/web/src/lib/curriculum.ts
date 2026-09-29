/**
 * The outline of the course. The index, chapter headers, pagers and drill unlocks all read from here.
 * Chapter bodies live in src/content/chapters/<slug>.mdx.
 */

export interface Part {
  numeral: string;
  title: string;
  blurb: string;
}

export interface ChapterMeta {
  number: number;
  slug: string;
  title: string;
  part: string;
  /** One line for the index. */
  summary: string;
  /** Key of the hover specimen drawn on the index (src/lib/specimens.ts). */
  specimen: string;
  /** Lab instruments this chapter opens, by id. */
  instruments: InstrumentId[];
  /** Eye trainer drill it unlocks or uses. */
  drill?: DrillId;
}

export type InstrumentId =
  | "spacing-chart"
  | "curve-bench"
  | "spring-bench"
  | "exposure-sheet"
  | "frame-stepper"
  | "eye-trainer"
  | "canvas-sandbox"
  | "specimen-journal"
  | "export-desk"
  | "data-stage";

export type DrillId =
  | "guess-duration"
  | "match-curve"
  | "which-heavier"
  | "tune-to-match"
  | "spot-principle"
  | "fix-feeling"
  | "transition-lies"
  | "blind-ab"
  | "what-it-says";

export const parts: Part[] = [
  { numeral: "I", title: "Seeing", blurb: "Timing and spacing: the two things to learn." },
  { numeral: "II", title: "Physics", blurb: "Weight, springs, momentum. Motion that obeys a world." },
  { numeral: "III", title: "The principles, for interfaces", blurb: "The Disney twelve, translated to UI." },
  { numeral: "IV", title: "Choreography", blurb: "Who leads, who follows, who leaves." },
  { numeral: "V", title: "Continuity and space", blurb: "The same thing in a new place." },
  { numeral: "VI", title: "Interaction", blurb: "Motion under the finger." },
  { numeral: "VII", title: "The canvas", blurb: "Motion from nothing, one frame at a time." },
  { numeral: "VIII", title: "Craft", blurb: "Performance, care, and taste." },
  { numeral: "IX", title: "Special topics", blurb: "Motion that explains data. Motion as a system." },
  { numeral: "—", title: "Capstone", blurb: "Your own motion system." },
];

export const chapters: ChapterMeta[] = [
  { number: 1, slug: "01-motion-is-information", title: "Motion is information", part: "I", summary: "What motion tells us: causality, continuity, attention, feedback, state.", specimen: "information", instruments: ["frame-stepper"], drill: "what-it-says" },
  { number: 2, slug: "02-timing", title: "Timing", part: "I", summary: "Duration as weight, mood, and importance. See in frames.", specimen: "timing", instruments: ["spacing-chart", "frame-stepper"], drill: "guess-duration" },
  { number: 3, slug: "03-spacing", title: "Spacing", part: "I", summary: "The key idea of the course: easing is spacing.", specimen: "spacing", instruments: ["spacing-chart", "curve-bench"], drill: "match-curve" },
  { number: 4, slug: "04-weight", title: "Weight", part: "II", summary: "Heavy and light along the same path. Only timing and spacing change.", specimen: "weight", instruments: ["spacing-chart", "canvas-sandbox"], drill: "which-heavier" },
  { number: 5, slug: "05-springs", title: "Springs", part: "II", summary: "Durations are a lie; springs are a model.", specimen: "springs", instruments: ["spring-bench"], drill: "tune-to-match" },
  { number: 6, slug: "06-momentum-and-friction", title: "Momentum and friction", part: "II", summary: "Flicks, inertia, and where a throw will land.", specimen: "momentum", instruments: ["spring-bench", "canvas-sandbox"], drill: "blind-ab" },
  { number: 7, slug: "07-the-twelve-translated", title: "The twelve, translated", part: "III", summary: "The principles of The Illusion of Life, each as a UI example.", specimen: "twelve", instruments: ["curve-bench", "spring-bench", "exposure-sheet"], drill: "spot-principle" },
  { number: 8, slug: "08-stagger-and-hierarchy", title: "Stagger and hierarchy", part: "IV", summary: "Who leads, who follows. Stagger as reading order.", specimen: "stagger", instruments: ["exposure-sheet"], drill: "blind-ab" },
  { number: 9, slug: "09-enter-exit-change", title: "Enter, exit, change", part: "IV", summary: "Enters are generous, exits are quick. Where does it come from?", specimen: "enter-exit", instruments: ["exposure-sheet", "curve-bench"], drill: "blind-ab" },
  { number: 10, slug: "10-object-permanence", title: "Object permanence", part: "V", summary: "The same thing, a new place: shared elements and FLIP.", specimen: "permanence", instruments: ["exposure-sheet", "frame-stepper"], drill: "blind-ab" },
  { number: 11, slug: "11-spatial-models", title: "Spatial models", part: "V", summary: "The app as a place: depth, direction, back and forward.", specimen: "spatial", instruments: ["exposure-sheet"], drill: "blind-ab" },
  { number: 12, slug: "12-direct-manipulation", title: "Direct manipulation", part: "VI", summary: "1:1 tracking, rubber-banding, release with velocity.", specimen: "direct", instruments: ["spring-bench", "canvas-sandbox"], drill: "blind-ab" },
  { number: 13, slug: "13-scroll-as-time", title: "Scroll as time", part: "VI", summary: "Scroll as a scrubber: when it helps, when it hijacks.", specimen: "scroll", instruments: ["exposure-sheet"], drill: "blind-ab" },
  { number: 14, slug: "14-the-loop", title: "The loop", part: "VII", summary: "Canvas as a flipbook: clear, draw, repeat. Only dt survives.", specimen: "loop", instruments: ["canvas-sandbox"], drill: "guess-duration" },
  { number: 15, slug: "15-easing-by-hand", title: "Easing by hand", part: "VII", summary: "lerp, t, and the frame-rate trap in x += (target − x) · k.", specimen: "easing-hand", instruments: ["canvas-sandbox", "curve-bench"], drill: "match-curve" },
  { number: 16, slug: "16-physics-by-hand", title: "Physics by hand", part: "VII", summary: "Euler, semi-implicit Euler, Verlet. A spring from scratch.", specimen: "physics-hand", instruments: ["canvas-sandbox", "spring-bench"], drill: "tune-to-match" },
  { number: 17, slug: "17-many-things", title: "Many things", part: "VII", summary: "Particles, trails, and flocks: emergent choreography.", specimen: "many", instruments: ["canvas-sandbox"], drill: "blind-ab" },
  { number: 18, slug: "18-organic-motion", title: "Organic motion", part: "VII", summary: "Noise vs random: nature is smooth randomness.", specimen: "organic", instruments: ["canvas-sandbox"], drill: "blind-ab" },
  { number: 19, slug: "19-choosing-the-medium", title: "Choosing the medium", part: "VII", summary: "CSS, WAAPI, SVG, Canvas, WebGL: what each is for.", specimen: "medium", instruments: ["canvas-sandbox", "export-desk"], drill: "blind-ab" },
  { number: 20, slug: "20-performance", title: "Performance", part: "VIII", summary: "Style, layout, paint, composite. Frame budgets at 120Hz.", specimen: "performance", instruments: ["frame-stepper", "canvas-sandbox"], drill: "blind-ab" },
  { number: 21, slug: "21-care", title: "Care", part: "VIII", summary: "Reduced motion: reduce, don't remove.", specimen: "care", instruments: ["spacing-chart"], drill: "blind-ab" },
  { number: 22, slug: "22-taste", title: "Taste", part: "VIII", summary: "Frequency, personality, and when not to animate.", specimen: "taste", instruments: ["specimen-journal", "curve-bench"], drill: "fix-feeling" },
  { number: 23, slug: "23-animated-infographics", title: "Animated infographics", part: "IX", summary: "Object constancy, staged reveals, and motion that doesn't lie.", specimen: "infographics", instruments: ["data-stage"], drill: "transition-lies" },
  { number: 24, slug: "24-motion-architecture", title: "Motion architecture", part: "IX", summary: "Tokens, primitives, patterns, policy: motion as a system.", specimen: "architecture", instruments: ["exposure-sheet", "export-desk"], drill: "fix-feeling" },
  { number: 25, slug: "25-your-motion-system", title: "Your motion system", part: "—", summary: "Architect it, build one screen, publish its spacing charts.", specimen: "capstone", instruments: ["export-desk", "specimen-journal"], drill: "blind-ab" },
];

export const chapterBySlug = (slug: string) => chapters.find((c) => c.slug === slug);
export const chapterByNumber = (n: number) => chapters.find((c) => c.number === n);
export const pad2 = (n: number) => String(n).padStart(2, "0");
export const partOf = (c: ChapterMeta) => parts.find((p) => p.numeral === c.part)!;

export interface InstrumentMeta {
  id: InstrumentId;
  code: string;
  name: string;
  does: string;
  trains: string;
}

export const instruments: InstrumentMeta[] = [
  { id: "spacing-chart", code: "L1", name: "Spacing chart", does: "An object's positions per frame as onion-skin ghosts, plus an animator's tick chart.", trains: "Spacing = easing" },
  { id: "curve-bench", code: "L2", name: "Curve bench", does: "Cubic-bezier editor with position and velocity graphs side by side, plus A/B compare.", trains: "Reading a curve as speed" },
  { id: "spring-bench", code: "L3", name: "Spring bench", does: "Stiffness, damping, mass, or response and bounce. Live graph, settle time, CSS linear() export.", trains: "Physics as feel" },
  { id: "exposure-sheet", code: "L4", name: "Exposure sheet", does: "Multi-track timeline for keyframes, offsets, and staggers across several elements.", trains: "Choreography, overlap" },
  { id: "frame-stepper", code: "L5", name: "Frame stepper", does: "Play anything at 1×, 0.25×, 0.1×, or step it frame by frame.", trains: "Observation" },
  { id: "eye-trainer", code: "L6", name: "Eye trainer", does: "Perception drills, scored, with a calibration graph.", trains: "Intuition, measured" },
  { id: "canvas-sandbox", code: "L7", name: "Canvas sandbox", does: "Live-code canvas with the rAF loop scaffolded, dt and fps readouts, pause and step.", trains: "Motion from scratch" },
  { id: "specimen-journal", code: "L8", name: "Specimen journal", does: "Save any lab state with feeling-words. Your personal motion vocabulary.", trains: "Taste" },
  { id: "export-desk", code: "L9", name: "Export desk", does: "Any lab state as CSS, Web Animations, Motion, GSAP, or Canvas code.", trains: "Notation" },
  { id: "data-stage", code: "L10", name: "Data stage", does: "A chart that transitions between states. Match bars by key or position, stagger, staging; SVG or Canvas.", trains: "Motion that explains" },
];

export const instrumentById = (id: InstrumentId) => instruments.find((i) => i.id === id)!;
