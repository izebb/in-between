/**
 * Chapter shorthand → full instrument state. Used by <Lab> embeds and by snippet cards'
 * "Open in Lab" links, so a lesson can say easing="ease-in" duration={400} and nothing more.
 */
import type { InstrumentId } from "./curriculum";
import { toMove } from "./spec";
import type { Property } from "@inbetween/core";

export interface LabShorthand {
  title?: string;
  easing?: string;
  compare?: string | boolean;
  duration?: number;
  delay?: number;
  distance?: number;
  from?: number;
  to?: number;
  property?: Property;
  fps?: number;
  dialect?: string;
  /** Free code (Frame Stepper, Canvas Sandbox). */
  source?: string;
  /** Spring bench. */
  response?: number;
  bounce?: number;
  stiffness?: number;
  damping?: number;
  mass?: number;
  /** Any instrument-specific extras. */
  extra?: Record<string, unknown>;
}

export function labPreset(id: InstrumentId, s: LabShorthand): Record<string, unknown> {
  const move = () =>
    toMove({
      easing: s.easing,
      duration: s.duration,
      delay: s.delay,
      from: s.from,
      to: s.to ?? s.distance,
      property: s.property,
    });
  switch (id) {
    case "spacing-chart":
      return clean({
        scene: { title: s.title ?? "Spacing chart", moves: [move()] },
        fps: s.fps,
        compare: s.compare === true || s.compare === "linear" ? true : undefined,
        dialect: s.dialect,
        ...s.extra,
      });
    case "curve-bench":
      return clean({
        scene: { title: s.title ?? "Curve bench", moves: [move()] },
        compare: typeof s.compare === "string" ? s.compare : undefined,
        dialect: s.dialect,
        ...s.extra,
      });
    case "frame-stepper":
      return clean({ mode: s.source ? "code" : undefined, code: s.source, dialect: s.dialect, ...s.extra });
    default:
      return clean({ ...s, ...s.extra });
  }
}

function clean(o: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
}
