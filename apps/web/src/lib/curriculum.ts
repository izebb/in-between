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
  { numeral: "I", title: "Seeing", blurb: "What motion says, and its two controls: timing and spacing." },
  { numeral: "II", title: "Physics", blurb: "Weight, springs, momentum: motion that behaves as if the screen had physics." },
  { numeral: "III", title: "The principles, for interfaces", blurb: "The twelve animation principles, each as an interface example." },
  { numeral: "IV", title: "Choreography", blurb: "Who moves first, who follows, and how things arrive and leave." },
  { numeral: "V", title: "Continuity and space", blurb: "Keeping one thing recognisable as it changes place, and giving the app a map." },
  { numeral: "VI", title: "Interaction", blurb: "Motion that follows the finger, and motion driven by scroll." },
  { numeral: "VII", title: "The canvas", blurb: "Writing motion yourself: the loop, easing, physics, many things, noise, and the choice of medium." },
  { numeral: "VIII", title: "Craft", blurb: "Keeping motion fast, kind to people who want less of it, and restrained." },
  { numeral: "IX", title: "Special topics", blurb: "Motion that explains data, and motion managed as a system." },
  { numeral: "—", title: "Capstone", blurb: "Build your own motion system." },
];

export const chapters: ChapterMeta[] = [
  { number: 1, slug: "01-motion-is-information", title: "Motion is information", part: "I", summary: "What motion tells the viewer: cause, continuity, attention, feedback, state.", specimen: "information", instruments: ["frame-stepper"], drill: "what-it-says" },
  { number: 2, slug: "02-timing", title: "Timing", part: "I", summary: "Duration as weight, mood and importance. Seeing motion in frames.", specimen: "timing", instruments: ["spacing-chart", "frame-stepper"], drill: "guess-duration" },
  { number: 3, slug: "03-spacing", title: "Spacing", part: "I", summary: "The central idea: easing is spacing, the distance between frames.", specimen: "spacing", instruments: ["spacing-chart", "curve-bench"], drill: "match-curve" },
  { number: 4, slug: "04-weight", title: "Weight", part: "II", summary: "Heavy and light along the same path. Only timing and spacing change.", specimen: "weight", instruments: ["spacing-chart", "canvas-sandbox"], drill: "which-heavier" },
  { number: 5, slug: "05-springs", title: "Springs", part: "II", summary: "A spring has no set duration. Time is a result of its physics.", specimen: "springs", instruments: ["spring-bench"], drill: "tune-to-match" },
  { number: 6, slug: "06-momentum-and-friction", title: "Momentum and friction", part: "II", summary: "Flicks, friction, and working out where a throw will land.", specimen: "momentum", instruments: ["spring-bench", "canvas-sandbox"], drill: "blind-ab" },
  { number: 7, slug: "07-the-twelve-translated", title: "The twelve, translated", part: "III", summary: "The twelve principles of Disney's animators, each as an interface example.", specimen: "twelve", instruments: ["curve-bench", "spring-bench", "exposure-sheet"], drill: "spot-principle" },
  { number: 8, slug: "08-stagger-and-hierarchy", title: "Stagger and hierarchy", part: "IV", summary: "Who leads and who follows. A small stagger sets reading order.", specimen: "stagger", instruments: ["exposure-sheet"], drill: "blind-ab" },
  { number: 9, slug: "09-enter-exit-change", title: "Enter, exit, change", part: "IV", summary: "Entrances and exits are different motions. Where does it come from, and where does it go?", specimen: "enter-exit", instruments: ["exposure-sheet", "curve-bench"], drill: "blind-ab" },
  { number: 10, slug: "10-object-permanence", title: "Object permanence", part: "V", summary: "The same thing in a new place: the FLIP technique and View Transitions.", specimen: "permanence", instruments: ["exposure-sheet", "frame-stepper"], drill: "blind-ab" },
  { number: 11, slug: "11-spatial-models", title: "Spatial models", part: "V", summary: "The app as a place: sequence, depth, back and forward.", specimen: "spatial", instruments: ["exposure-sheet"], drill: "blind-ab" },
  { number: 12, slug: "12-direct-manipulation", title: "Direct manipulation", part: "VI", summary: "Following the finger: 1:1 tracking, rubber-banding, release with velocity, interruption.", specimen: "direct", instruments: ["spring-bench", "canvas-sandbox"], drill: "blind-ab" },
  { number: 13, slug: "13-scroll-as-time", title: "Scroll as time", part: "VI", summary: "Scroll as a scrubber: when it helps and when it hijacks.", specimen: "scroll", instruments: ["exposure-sheet"], drill: "blind-ab" },
  { number: 14, slug: "14-the-loop", title: "The loop", part: "VII", summary: "Canvas as a flipbook: clear, draw, repeat. Move things by dt, not by frame.", specimen: "loop", instruments: ["canvas-sandbox"], drill: "guess-duration" },
  { number: 15, slug: "15-easing-by-hand", title: "Easing by hand", part: "VII", summary: "lerp (a blend toward a target) and the frame-rate trap in x += (target − x) · k.", specimen: "easing-hand", instruments: ["canvas-sandbox", "curve-bench"], drill: "match-curve" },
  { number: 16, slug: "16-physics-by-hand", title: "Physics by hand", part: "VII", summary: "Three ways to step physics forward (Euler, semi-implicit Euler, Verlet), then a spring from scratch.", specimen: "physics-hand", instruments: ["canvas-sandbox", "spring-bench"], drill: "tune-to-match" },
  { number: 17, slug: "17-many-things", title: "Many things", part: "VII", summary: "Particles, trails and flocks: motion from rules.", specimen: "many", instruments: ["canvas-sandbox"], drill: "blind-ab" },
  { number: 18, slug: "18-organic-motion", title: "Organic motion", part: "VII", summary: "Noise versus random: natural motion is randomness that stays smooth.", specimen: "organic", instruments: ["canvas-sandbox"], drill: "blind-ab" },
  { number: 19, slug: "19-choosing-the-medium", title: "Choosing the medium", part: "VII", summary: "CSS, WAAPI, SVG, Canvas and WebGL: what each is for.", specimen: "medium", instruments: ["canvas-sandbox", "export-desk"], drill: "blind-ab" },
  { number: 20, slug: "20-performance", title: "Performance", part: "VIII", summary: "The browser's steps per frame (style, layout, paint, composite) and the time a frame allows.", specimen: "performance", instruments: ["frame-stepper", "canvas-sandbox"], drill: "blind-ab" },
  { number: 21, slug: "21-care", title: "Care", part: "VIII", summary: "Reduced motion: reduce the movement, keep the message.", specimen: "care", instruments: ["spacing-chart"], drill: "blind-ab" },
  { number: 22, slug: "22-taste", title: "Taste", part: "VIII", summary: "Frequency, personality, and when not to animate.", specimen: "taste", instruments: ["specimen-journal", "curve-bench"], drill: "fix-feeling" },
  { number: 23, slug: "23-animated-infographics", title: "Animated infographics", part: "IX", summary: "Object constancy, staged reveals, and motion that does not mislead.", specimen: "infographics", instruments: ["data-stage"], drill: "transition-lies" },
  { number: 24, slug: "24-motion-architecture", title: "Motion architecture", part: "IX", summary: "Tokens, primitives, orchestration, patterns, policy: motion as a system.", specimen: "architecture", instruments: ["exposure-sheet", "export-desk"], drill: "fix-feeling" },
  { number: 25, slug: "25-your-motion-system", title: "Your motion system", part: "—", summary: "Design the system, build one screen with it, publish its spacing charts.", specimen: "capstone", instruments: ["export-desk", "specimen-journal"], drill: "blind-ab" },
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
  { id: "spacing-chart", code: "L1", name: "Spacing chart", does: "Where an object sits on every frame: ghost copies along its path, beside an animator's tick chart.", trains: "Spacing = easing" },
  { id: "curve-bench", code: "L2", name: "Curve bench", does: "Drag a cubic-bezier curve's handles; position and velocity graphs side by side, and a second curve to compare.", trains: "Reading a curve as speed" },
  { id: "spring-bench", code: "L3", name: "Spring bench", does: "Tune a spring by response and bounce, or stiffness, damping and mass. Live graph, settle time, CSS linear() to copy.", trains: "Physics as feel" },
  { id: "exposure-sheet", code: "L4", name: "Exposure sheet", does: "A timeline with one bar per element: shift a bar to offset it, or set a stagger to space many at once.", trains: "Choreography, overlap" },
  { id: "frame-stepper", code: "L5", name: "Frame stepper", does: "Play your code, or a page from this site, at 1×, 0.25× or 0.1×, or step it frame by frame.", trains: "Observation" },
  { id: "eye-trainer", code: "L6", name: "Eye trainer", does: "Perception drills, scored, with a calibration graph of how close your guesses run.", trains: "Intuition, measured" },
  { id: "canvas-sandbox", code: "L7", name: "Canvas sandbox", does: "A canvas you code live, animation loop already written, with dt (ms since the last frame) and fps readouts, pause and step.", trains: "Motion from scratch" },
  { id: "specimen-journal", code: "L8", name: "Specimen journal", does: "Save any lab state with the words you would use for its feel. A vocabulary of your own.", trains: "Taste" },
  { id: "export-desk", code: "L9", name: "Export desk", does: "Any lab state as CSS, Web Animations API, Motion (the library), GSAP or Canvas code.", trains: "Notation" },
  { id: "data-stage", code: "L10", name: "Data stage", does: "A chart that transitions between states. Match bars by key or by position, stagger or stage the change; SVG or Canvas.", trains: "Motion that explains" },
];

export const instrumentById = (id: InstrumentId) => instruments.find((i) => i.id === id)!;
