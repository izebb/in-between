/**
 * Chapter shorthand → full instrument state. Used by <Lab> embeds and by snippet cards'
 * "Open in Lab" links, so a lesson can say easing="ease-in" duration={400} and nothing more.
 */
import type { InstrumentId } from "./curriculum";
import { toMove } from "./spec";
import { fromResponse, type Property } from "@inbetween/core";
import { programs } from "./canvas/programs";

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
  /** Canvas sandbox: start from a registered program. */
  program?: string;
  hz?: number;
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
    case "spring-bench": {
      const physics = s.stiffness != null;
      const p = physics ? { stiffness: s.stiffness!, damping: s.damping ?? 10, mass: s.mass ?? 1 } : fromResponse(s.response ?? 0.5, s.bounce ?? 0.15, s.mass ?? 1);
      return clean({
        scene: { title: s.title ?? "Spring bench", moves: [toMove({ easing: { type: "spring", ...p, velocity: 0 }, to: s.to ?? s.distance ?? 320, property: s.property })] },
        mode: physics ? "physics" : "design",
        compare: typeof s.compare === "string" ? s.compare : undefined,
        dialect: s.dialect,
        ...s.extra,
      });
    }
    case "canvas-sandbox": {
      const prog = s.program ? programs[s.program] : undefined;
      return clean({
        code: s.source ?? prog?.source,
        example: s.program,
        title: s.title ?? prog?.title,
        params: prog ? Object.fromEntries((prog.params ?? []).map((x) => [x.key, x.value])) : undefined,
        hz: s.hz,
        ...s.extra,
      });
    }
    case "exposure-sheet":
      // use: "list" | "overlap" | "unison" | "cascade"; stagger overrides the step.
      return clean({ use: s.extra?.use ?? s.source, stagger: s.extra?.stagger, layout: s.extra?.layout, order: s.extra?.order, ...s.extra });
    case "data-stage":
      // extra: { from, to, keying: "data"|"index", staging: "together"|"staged", stagger, duration, easing, renderer }
      return clean({ duration: s.duration, easing: s.easing, ...s.extra });
    case "export-desk":
      return clean({ scene: { title: s.title ?? "Export", moves: [move()] } });
    case "frame-stepper":
      return clean({ mode: s.source ? "code" : undefined, code: s.source, dialect: s.dialect, ...s.extra });
    default:
      return clean({ ...s, ...s.extra });
  }
}

function clean(o: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
}
