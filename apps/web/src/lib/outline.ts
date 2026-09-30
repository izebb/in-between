/**
 * Build-time only (imported from .astro frontmatter): a line of text as outlines in a theme's display
 * face, one SVG per word so the line can still wrap, one path per letter so each can be drawn on.
 * Units are 1000 per em, baseline at y = 0.
 */
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import opentype from "opentype.js";
import type { ThemeId } from "~/motion/tokens";

export interface OutlineWord {
  width: number;
  letters: string[];
}
export interface Outline {
  em: number;
  top: number;
  bottom: number;
  words: OutlineWord[];
  /** The gap between two words (a space, tracked), for setting them on one line. */
  space: number;
}

/** Each theme's display face as static cuts (an @fontsource package): drawn type is drawn in the
 *  face its theme sets type in, and the page shows the drawing its theme writes (tokens.css). */
const FACES: Record<ThemeId, string> = { pencil: "geist", glassy: "sora", mono: "jetbrains-mono", cartoon: "comic-neue" };
export type Face = ThemeId;
export const faces = Object.keys(FACES) as Face[];

const EM = 1000;
const fonts = new Map<string, any>();
const require = createRequire(import.meta.url);
/** The cut to draw a weight in: that weight, or where a face doesn't cut it, the next heavier one it
 *  does (a drawn title keeps its body), or failing that its heaviest. */
function cut(face: Face, weight: number) {
  const pkg = FACES[face];
  const dir = dirname(require.resolve(`@fontsource/${pkg}/package.json`));
  const cuts = readdirSync(join(dir, "files"))
    .map((f) => f.match(new RegExp(`^${pkg}-latin-(\\d+)-normal\\.woff$`))?.[1])
    .filter(Boolean)
    .map(Number)
    .sort((a, b) => a - b);
  const w = cuts.find((c) => c >= weight) ?? cuts[cuts.length - 1];
  return join(dir, "files", `${pkg}-latin-${w}-normal.woff`);
}
function load(face: Face, weight: number) {
  const file = cut(face, weight);
  if (fonts.has(file)) return fonts.get(file);
  const buf = readFileSync(file);
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  fonts.set(file, font);
  return font;
}

/** Geist's tabular figures (its tnum feature): the 1 with a foot, and every figure one width. A face
 *  without these glyphs keeps its own figures. */
const TABULAR: Record<string, string> = { "0": "zero.tf", "1": "one.tf", "4": "four.tf", "7": "seven.tf" };
function glyphsOf(f: any, word: string, tabular: boolean) {
  const glyphs = f.stringToGlyphs(word);
  if (!tabular) return glyphs;
  return glyphs.map((g: any, i: number) => {
    const name = TABULAR[word[i]];
    if (!name) return g;
    for (let k = 0; k < f.glyphs.length; k++) if (f.glyphs.get(k).name === name) return f.glyphs.get(k);
    return g;
  });
}

export interface OutlineOptions {
  /** A static weight: 500 (the headings) by default. */
  weight?: number;
  /** Tabular figures. */
  tabular?: boolean;
  /** Whose face: Pencil's Geist by default. */
  face?: Face;
}

/** `tracking` in em, as the heading's letter-spacing. */
export function outline(text: string, tracking = -0.025, { weight = 500, tabular = false, face = "pencil" }: OutlineOptions = {}): Outline {
  const f = load(face, weight);
  const scale = EM / f.unitsPerEm;
  const track = tracking * EM;
  let top = 0;
  let bottom = 0;
  const words = text.split(" ").filter(Boolean).map((word) => {
    const glyphs = glyphsOf(f, word, tabular);
    let x = 0;
    const letters: string[] = [];
    glyphs.forEach((g: any, i: number) => {
      const path = g.getPath(x, 0, EM);
      const box = path.getBoundingBox();
      if (Number.isFinite(box.y1)) {
        top = Math.min(top, box.y1);
        bottom = Math.max(bottom, box.y2);
      }
      letters.push(path.toPathData(1));
      const kern = i < glyphs.length - 1 ? f.getKerningValue(g, glyphs[i + 1]) * scale : 0;
      x += g.advanceWidth * scale + kern + track;
    });
    return { width: Math.round(x - track), letters };
  });
  const space = Math.round(f.charToGlyph(" ").advanceWidth * scale + track);
  return { em: EM, top: Math.floor(top), bottom: Math.ceil(bottom), words, space };
}

/** A number as outline figures, ready to draw: OutlineNumber.astro, or an island that is handed it. */
export interface Numeral {
  viewBox: string;
  /** The SVG's size in em, and a negative margin that takes back its padding. */
  style: string;
  /** One path per figure. */
  letters: string[];
}

export function numeral(text: string, face: Face = "pencil"): Numeral {
  // Bold, tabular figures: an outline needs body between its two edges, or the straight figures (1, 4)
  // read as wireframes; and the tabular 1 has its foot.
  const o = outline(text, 0, { weight: 700, tabular: true, face });
  const PAD = 40;
  const w = o.words[0];
  const h = o.bottom - o.top + 2 * PAD;
  return {
    viewBox: `${-PAD} ${o.top - PAD} ${w.width + 2 * PAD} ${h}`,
    style: `width:${(w.width + 2 * PAD) / o.em}em;height:${h / o.em}em;margin:${-PAD / o.em}em`,
    letters: w.letters,
  };
}

/** A number in every theme's face, for an island to draw the one its theme writes. */
export function numerals(text: string): Record<Face, Numeral> {
  return Object.fromEntries(faces.map((f) => [f, numeral(text, f)])) as Record<Face, Numeral>;
}
