/**
 * Changed-token flash. When a knob changes, the characters it rewrote flash in red pencil.
 * You see exactly which characters a feeling lives in.
 */

import { StateEffect, StateField, type Range } from "@codemirror/state";
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view";

export const flashEffect = StateEffect.define<{ from: number; to: number }[]>();
const clearEffect = StateEffect.define<number>();

const mark = Decoration.mark({ class: "cm-flash" });

let generation = 0;

const flashField = StateField.define<{ gen: number; deco: DecorationSet }>({
  create: () => ({ gen: 0, deco: Decoration.none }),
  update(value, tr) {
    let { gen, deco } = value;
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(flashEffect)) {
        const ranges: Range<Decoration>[] = e.value
          .filter((r) => r.to > r.from && r.to <= tr.state.doc.length)
          .sort((a, b) => a.from - b.from)
          .map((r) => mark.range(r.from, r.to));
        deco = Decoration.set(ranges, true);
        gen = ++generation;
      }
      if (e.is(clearEffect) && e.value === gen) deco = Decoration.none;
    }
    return { gen, deco };
  },
  provide: (f) => EditorView.decorations.from(f, (v) => v.deco),
});

/** Flash these ranges (in the current document). Clears itself after `ms`. */
export function flash(view: EditorView, ranges: { from: number; to: number }[], ms = 700) {
  if (!ranges.length) return;
  view.dispatch({ effects: flashEffect.of(ranges) });
  const gen = view.state.field(flashField).gen;
  setTimeout(() => {
    if (view.state.field(flashField, false)?.gen === gen) view.dispatch({ effects: clearEffect.of(gen) });
  }, ms);
}

export const tokenFlash = [flashField];
