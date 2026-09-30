/**
 * Build-time only (imported from .astro frontmatter): a line of text as Geist Medium outlines,
 * one SVG per word so the line can still wrap, one path per letter so each can be drawn on.
 * Units are 1000 per em, baseline at y = 0.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import opentype from "opentype.js";

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

const EM = 1000;
const fonts = new Map<number, any>();
function geist(weight: number) {
  if (fonts.has(weight)) return fonts.get(weight);
  const require = createRequire(import.meta.url);
  const buf = readFileSync(require.resolve(`@fontsource/geist/files/geist-latin-${weight}-normal.woff`));
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  fonts.set(weight, font);
  return font;
}

/** Geist's tabular figures (its tnum feature): the 1 with a foot, and every figure one width. */
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
  /** A static Geist weight: 500 (the headings) by default. */
  weight?: number;
  /** Tabular figures. */
  tabular?: boolean;
}

/** `tracking` in em, as the heading's letter-spacing. */
export function outline(text: string, tracking = -0.025, { weight = 500, tabular = false }: OutlineOptions = {}): Outline {
  const f = geist(weight);
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

export function numeral(text: string): Numeral {
  // Bold, tabular figures: an outline needs body between its two edges, or the straight figures (1, 4)
  // read as wireframes; and the tabular 1 has its foot.
  const o = outline(text, 0, { weight: 700, tabular: true });
  const PAD = 40;
  const w = o.words[0];
  const h = o.bottom - o.top + 2 * PAD;
  return {
    viewBox: `${-PAD} ${o.top - PAD} ${w.width + 2 * PAD} ${h}`,
    style: `width:${(w.width + 2 * PAD) / o.em}em;height:${h / o.em}em;margin:${-PAD / o.em}em`,
    letters: w.letters,
  };
}
