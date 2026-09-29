/**
 * Line ↔ stage links. Hovering a line reports which scene paths it controls;
 * hovering the stage highlights the lines that control what's under the pointer.
 */

import { StateEffect, StateField, RangeSetBuilder, Facet } from "@codemirror/state";
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view";

export interface LinkHoverOptions {
  /** Targets per line (0-based line index). */
  targetsFor: (lineIndex: number) => string[];
  onHover: (targets: string[] | null) => void;
}

export const setLinked = StateEffect.define<string | null>();
const linesFacet = Facet.define<(i: number) => string[], (i: number) => string[]>({
  combine: (v) => v[v.length - 1] ?? (() => []),
});

const linkedField = StateField.define<{ group: string | null; deco: DecorationSet }>({
  create: () => ({ group: null, deco: Decoration.none }),
  update(value, tr) {
    let { group, deco } = value;
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setLinked)) {
        group = e.value;
        const b = new RangeSetBuilder<Decoration>();
        if (group) {
          const targetsFor = tr.state.facet(linesFacet);
          const line = Decoration.line({ class: "cm-linked" });
          for (let i = 1; i <= tr.state.doc.lines; i++) {
            const ts = targetsFor(i - 1);
            const gs = group.split(/\s+/);
            if (ts.some((t) => gs.some((g) => t === g || t.startsWith(g + ".") || (t.includes(".") && g.startsWith(t + "."))))) {
              const l = tr.state.doc.line(i);
              b.add(l.from, l.from, line);
            }
          }
        }
        deco = b.finish();
      }
    }
    return { group, deco };
  },
  provide: (f) => EditorView.decorations.from(f, (v) => v.deco),
});

export function linkHover(opts: LinkHoverOptions) {
  let last: string | null = null;
  return [
    linesFacet.of(opts.targetsFor),
    linkedField,
    EditorView.domEventHandlers({
      mousemove(e, view) {
        const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
        if (pos == null) return false;
        const lineIndex = view.state.doc.lineAt(pos).number - 1;
        const ts = opts.targetsFor(lineIndex);
        const key = ts.join("|");
        if (key !== last) {
          last = key;
          opts.onHover(ts.length ? ts : null);
        }
        return false;
      },
      mouseleave() {
        last = null;
        opts.onHover(null);
        return false;
      },
    }),
  ];
}
