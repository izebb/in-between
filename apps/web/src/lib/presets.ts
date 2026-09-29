/**
 * Named curves for the benches. CSS keywords first, then the app's own tokens,
 * then a few classic hand-written curves.
 */
import type { EasingSpec } from "@inbetween/core";
import { easing as tokenEasing, spring as tokenSpring } from "~/motion/tokens";

export interface CurvePreset {
  id: string;
  label: string;
  spec: EasingSpec;
  note?: string;
}

const c = (x1: number, y1: number, x2: number, y2: number): EasingSpec => ({ type: "cubic", x1, y1, x2, y2 });

export const cubicPresets: CurvePreset[] = [
  { id: "linear", label: "linear", spec: c(0, 0, 1, 1), note: "Constant speed. Mechanical." },
  { id: "ease", label: "ease", spec: c(0.25, 0.1, 0.25, 1), note: "The CSS default. Quick start, long settle." },
  { id: "ease-in", label: "ease-in", spec: c(0.42, 0, 1, 1), note: "Starts slow, leaves fast. For exits." },
  { id: "ease-out", label: "ease-out", spec: c(0, 0, 0.58, 1), note: "Starts fast, settles. For enters." },
  { id: "ease-in-out", label: "ease-in-out", spec: c(0.42, 0, 0.58, 1), note: "Slow at both ends. For on-screen moves." },
  { id: "token-out", label: "--ease-out", spec: c(...(tokenEasing.out as unknown as [number, number, number, number])), note: "This app's enter curve." },
  { id: "token-in", label: "--ease-in", spec: c(...(tokenEasing.in as unknown as [number, number, number, number])), note: "This app's exit curve." },
  { id: "token-inout", label: "--ease-inout", spec: c(...(tokenEasing.inout as unknown as [number, number, number, number])), note: "This app's on-screen move." },
  { id: "out-quart", label: "out-quart", spec: c(0.25, 1, 0.5, 1), note: "A strong ease-out." },
  { id: "out-back", label: "out-back", spec: c(0.34, 1.56, 0.64, 1), note: "Overshoots, then returns." },
  { id: "in-back", label: "in-back", spec: c(0.36, 0, 0.66, -0.56), note: "Winds up backwards first: anticipation." },
];

export const springPresets: { id: string; label: string; response: number; bounce: number }[] = [
  { id: "snappy", label: "spring.snappy", response: tokenSpring.snappy.response, bounce: tokenSpring.snappy.bounce },
  { id: "soft", label: "spring.soft", response: tokenSpring.soft.response, bounce: tokenSpring.soft.bounce },
  { id: "bouncy", label: "bouncy", response: 0.5, bounce: 0.4 },
  { id: "heavy", label: "heavy", response: 0.9, bounce: 0.05 },
  { id: "sluggish", label: "overdamped", response: 0.6, bounce: -0.4 },
];

export function presetFor(spec: EasingSpec): CurvePreset | undefined {
  if (spec.type !== "cubic") return undefined;
  const r = (n: number) => Math.round(n * 1000);
  return cubicPresets.find(
    (p) =>
      p.spec.type === "cubic" &&
      r(p.spec.x1) === r(spec.x1) &&
      r(p.spec.y1) === r(spec.y1) &&
      r(p.spec.x2) === r(spec.x2) &&
      r(p.spec.y2) === r(spec.y2),
  );
}
