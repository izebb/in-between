/**
 * Each lab instrument as a small line drawing, one path on a 24-unit grid, drawn at 24px with one
 * stroke weight (so it can be traced as one line on hover). Dots are tiny circles within the path.
 */
import type { InstrumentId } from "./curriculum";

const dot = (x: number, y: number, r = 1.5) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;

export const instrumentIcons: Record<InstrumentId, string> = {
  // A ball's arc drawn frame by frame: the drawings close together at the top, where it slows, and
  // far apart near the ground, where it is fast. Spacing, as animators draw it.
  "spacing-chart":
    "M2 21H22" +
    [
      [3.5, 18],
      [7, 10],
      [12, 6.5],
      [17, 10],
      [20.5, 18],
    ].map(([x, y]) => dot(x, y, 1.75)).join(""),
  // An easing curve on its axes
  "curve-bench": "M4 3V20H21M4 20C11 20 13 5 20 5",
  // A spring settling
  "spring-bench": "M2 12C3.5 4 5.5 4 7 12S10.5 18.5 12 12S14.5 8.5 16 12S18.5 14 20 12H22",
  // Three clips on three tracks, each starting a little after the last
  "exposure-sheet": [
    [3, 4],
    [7, 10],
    [11, 16],
  ].map(([x, y]) => `M${x + 2} ${y}H${x + 8}a2 2 0 0 1 0 4H${x + 2}a2 2 0 0 1 0-4Z`).join(""),
  // A strip of three frames
  "frame-stepper": "M3 6H21V18H3ZM9 6V18M15 6V18",
  // An eye
  "eye-trainer": "M2 12C5 6.5 8.5 5 12 5S19 6.5 22 12C19 17.5 15.5 19 12 19S5 17.5 2 12Z" + dot(12, 12, 3),
  // Code brackets round a ball
  "canvas-sandbox": "M8 7L3 12L8 17M16 7L21 12L16 17" + dot(12, 12),
  // A bookmark
  "specimen-journal": "M6 3H18V21L12 16.5L6 21Z",
  // Out of the box
  "export-desk": "M11 5H5V19H19V13M14 5H19V10M19 5L11 13",
  // Bars on a baseline
  "data-stage": "M3 20H21M7 20V13M12 20V6M17 20V10",
};
