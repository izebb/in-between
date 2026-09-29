/**
 * Each lab instrument as a small pencil drawing on a 32-unit grid: the tool itself, not a stock glyph.
 * A drawing is a list of strokes in the order a hand would draw them, one subpath each, so on hover the
 * blue pencil can go over them one after another (components.css .bi-icon-ink), as it goes round the
 * box's outline. Where the tool is about motion, the order acts it out: the ball's frames close up, the
 * clips start one after another, the code is written before the ball is thrown.
 */
import type { InstrumentId } from "./curriculum";

const circle = (x: number, y: number, r: number) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const rect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}H${x + w - r}a${r} ${r} 0 0 1 ${r} ${r}V${y + h - r}a${r} ${r} 0 0 1 ${-r} ${r}H${x + r}a${r} ${r} 0 0 1 ${-r} ${-r}V${y + r}a${r} ${r} 0 0 1 ${r} ${-r}Z`;
const pill = (x: number, y: number, w: number, h: number) => rect(x, y, w, h, h / 2);

export const instrumentIcons: Record<InstrumentId, string[]> = {
  // What the tool shows: a ball's drawings, one per frame, each over its tick on the chart below, and
  // closing up toward the end, where it slows. Drawn a frame at a time: the ball, then its tick.
  "spacing-chart": ["M3 23.5H29", ...[6, 14.5, 20.5, 24.5].flatMap((x, i, a) => {
    const key = i === 0 || i === a.length - 1;
    return [circle(x, 11, 3.5), `M${x} ${key ? 20 : 21}V${key ? 27 : 26}`];
  })],
  // A curve in its editor: the easing curve, then each handle and its knob.
  "curve-bench": ["M5 26C15 26 17 6 27 6", "M5 26H15", circle(15, 26, 1.9), "M27 6H17", circle(17, 6, 1.9)],
  // A weight hung on a spring from the ceiling.
  "spring-bench": ["M8 4H24", "M16 4V6.5L9.5 9L22.5 12L9.5 15L22.5 18L16 20.5V21.5", rect(9, 21.5, 14, 7.5, 2)],
  // A timeline: the same clip on three tracks, each starting a step after the one above (a stagger),
  // and the playhead running down across them.
  "exposure-sheet": [pill(3.5, 8.5, 15, 4.5), pill(8, 15, 15, 4.5), pill(12.5, 21.5, 15, 4.5), "M17.5 2.5H22.5V5L20 7.5L17.5 5Z", "M20 7.5V29"],
  // Step forward: the control, landing on the next of a row of frames.
  "frame-stepper": ["M7 7.5L19 15.5L7 23.5Z", "M24.5 7.5V23.5", ...[4.5, 9.5, 14.5, 19.5, 24.5].map((x) => `M${x} 28.5V29`)],
  // An eye, lids then iris then pupil.
  "eye-trainer": ["M3 16C7 9.5 11.5 7 16 7S25 9.5 29 16", "M29 16C25 22.5 20.5 25 16 25S7 22.5 3 16", circle(16, 16, 5), circle(16, 16, 1.6)],
  // The sandbox as it's laid out: code on the left, the canvas it runs on the right, where a ball has
  // just been thrown off the floor. Drawn in that order: frame, code, then the throw.
  "canvas-sandbox": [rect(3, 5, 26, 22, 3), "M13 5V27", "M6.5 11H10", "M8 15H10.5", "M6.5 19H9", "M16 23H26", "M16.5 22Q18.5 13 21 13.5", circle(23.5, 15, 2.3)],
  // A journal page with a bookmark, a curve pressed in it, and the words for its feel.
  "specimen-journal": [rect(6, 3, 20, 26, 2), "M19 3V9.5L21 8L23 9.5V3", "M10 18C13 18 14 12 18 12", "M10 22H22", "M10 25.5H16"],
  // A sheet of code, and what goes out of it.
  "export-desk": [rect(3, 5, 17, 22, 2), "M7 11H14", "M9 15H16", "M9 19H14", "M7 23H11", "M23 16H29.5", "M26 12.5L29.5 16L26 19.5"],
  // A bar chart whose bars trade places.
  "data-stage": ["M3 27H29", "M5.5 27V15H10.5V27", "M13.5 27V19.5H18.5V27", "M21.5 27V11H26.5V27", "M8 11Q15.5 3 24 7", "M22.4 4.2L24 7L20.9 7.5"],
};
