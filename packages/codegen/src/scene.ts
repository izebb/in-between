/**
 * The lab state every instrument edits: a scene of one or more moves.
 */

import type { Move, EasingSpec, Property } from "@inbetween/core";

export interface Scene {
  /** Shown as the first comment line, e.g. "03 · Spacing: arrive and settle". */
  title?: string;
  moves: Move[];
}

export interface ParamSpec {
  min: number;
  max: number;
  /** Drag/scrub step in scene units. */
  step: number;
}

/** Limits for every bindable field. Edits outside these are clamped. */
export function paramSpec(path: string): ParamSpec {
  const field = path.split(".").slice(1).join(".");
  switch (field) {
    case "duration":
      return { min: 16, max: 5000, step: 10 };
    case "delay":
      return { min: 0, max: 5000, step: 10 };
    case "from":
    case "to":
      return { min: -2000, max: 2000, step: 1 };
    case "easing.x1":
    case "easing.x2":
      return { min: 0, max: 1, step: 0.01 };
    case "easing.y1":
    case "easing.y2":
      return { min: -1.5, max: 2.5, step: 0.01 };
    case "easing.stiffness":
      return { min: 1, max: 1500, step: 1 };
    case "easing.damping":
      return { min: 0, max: 200, step: 0.5 };
    case "easing.mass":
      return { min: 0.1, max: 20, step: 0.1 };
    case "easing.velocity":
      return { min: -50, max: 50, step: 0.1 };
    case "easing.steps":
      return { min: 1, max: 60, step: 1 };
    default:
      return { min: -1e6, max: 1e6, step: 1 };
  }
}

export function getPath(scene: Scene, path: string): number | undefined {
  const [i, ...rest] = path.split(".");
  let cur: unknown = scene.moves[Number(i)];
  for (const k of rest) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[k];
  }
  return typeof cur === "number" ? cur : undefined;
}

/** Immutable set: returns a new scene with the value at path replaced (clamped). */
export function setPath(scene: Scene, path: string, value: number): Scene {
  const spec = paramSpec(path);
  const v = Math.min(spec.max, Math.max(spec.min, value));
  const [i, ...rest] = path.split(".");
  const idx = Number(i);
  const moves = scene.moves.map((m, j) => {
    if (j !== idx) return m;
    const copy = JSON.parse(JSON.stringify(m)) as Record<string, unknown>;
    let cur = copy;
    for (let k = 0; k < rest.length - 1; k++) cur = cur[rest[k]] as Record<string, unknown>;
    cur[rest[rest.length - 1]] = rest[rest.length - 1] === "steps" ? Math.round(v) : v;
    return copy as unknown as Move;
  });
  return { ...scene, moves };
}

export const DEFAULT_MOVE: Move = {
  target: "box",
  property: "x",
  from: 0,
  to: 240,
  duration: 280,
  delay: 0,
  easing: { type: "cubic", x1: 0.2, y1: 0.8, x2: 0.2, y2: 1 },
};

export function move(partial: Partial<Move> = {}): Move {
  return { ...DEFAULT_MOVE, ...partial, easing: partial.easing ?? DEFAULT_MOVE.easing };
}

export const cubic = (x1: number, y1: number, x2: number, y2: number): EasingSpec => ({ type: "cubic", x1, y1, x2, y2 });
export const springSpec = (stiffness: number, damping: number, mass = 1, velocity = 0): EasingSpec => ({
  type: "spring",
  stiffness,
  damping,
  mass,
  velocity,
});

/** Is the property a transform (translate/scale/rotate) rather than opacity? */
export const isTransform = (p: Property) => p !== "opacity";

/** Encode any lab state for URLs (?s=…): JSON → UTF-8 → base64url. */
export function encodeState(state: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeState<T = unknown>(s: string): T | null {
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    return null;
  }
}
