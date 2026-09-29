/**
 * Runs a canvas program in the page (chapter figures). Fixed-step simulation, so stepping,
 * scrubbing and "still" onion skins are deterministic.
 */
import { PRELUDE, EXPORTS } from "./prelude";
import type { Pencils } from "~/lib/specimens";

export interface Pointer {
  x: number;
  y: number;
  down: boolean;
  vx: number;
  vy: number;
}

export interface Program {
  setup: ((w: number, h: number) => unknown) | null;
  update: ((s: unknown, dt: number) => void) | null;
  draw: ((ctx: CanvasRenderingContext2D, s: unknown, w: number, h: number) => void) | null;
  onPointer: ((s: unknown, p: Pointer, type: string) => void) | null;
  loop: number | null;
}

export function compile(source: string, env: { params: Record<string, number | boolean | string>; pointer: Pointer; pencils: Pencils }): Program {
  // User code runs in an inner scope so it may shadow any helper name.
  const fn = new Function("params", "pointer", "pencils", PRELUDE + "\nreturn (function () {\n" + source + "\n" + EXPORTS + "\n})();");
  return fn(env.params, env.pointer, env.pencils) as Program;
}
