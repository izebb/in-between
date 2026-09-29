/**
 * Bound parameters: numbers in the code that *are* knobs.
 *
 * Each binding is a character range tied to a scene path. Ranges are mapped through
 * every edit, so typing inside "280" still updates `duration`. Knob changes rewrite
 * only their own range (tagged with the `fromKnob` annotation so they don't echo back).
 */

import { Annotation, StateEffect, StateField, type Range } from "@codemirror/state";
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view";

export interface BoundParam {
  path: string;
  from: number;
  to: number;
}

/** Marks a transaction as coming from a knob (not a person typing). */
export const fromKnob = Annotation.define<boolean>();

export const setBindings = StateEffect.define<BoundParam[]>();
export const setHotGroup = StateEffect.define<string | null>();

interface BoundState {
  bindings: BoundParam[];
  hot: string | null;
}

const NUMBER = /^-?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i;

export const boundField = StateField.define<BoundState>({
  create: () => ({ bindings: [], hot: null }),
  update(value, tr) {
    let { bindings, hot } = value;
    if (!tr.changes.empty) {
      bindings = bindings.map((b) => ({
        ...b,
        from: tr.changes.mapPos(b.from, -1),
        to: tr.changes.mapPos(b.to, 1),
      }));
    }
    for (const e of tr.effects) {
      if (e.is(setBindings)) bindings = e.value;
      if (e.is(setHotGroup)) hot = e.value;
    }
    return { bindings, hot };
  },
  provide: (f) =>
    EditorView.decorations.from(f, (v): DecorationSet => {
      const ranges: Range<Decoration>[] = [];
      for (const b of v.bindings) {
        if (b.to <= b.from) continue;
        const hot = !!v.hot && v.hot.split(/\s+/).some((h) => b.path === h || b.path.startsWith(h + "."));
        ranges.push(
          Decoration.mark({
            class: hot ? "cm-bound cm-bound-hot" : "cm-bound",
            attributes: { "data-path": b.path },
          }).range(b.from, b.to),
        );
      }
      return Decoration.set(ranges, true);
    }),
});

/** Read every binding's current text as a number (NaN when the edit broke it). */
export function readBindings(view: EditorView): { path: string; value: number; text: string }[] {
  const { bindings } = view.state.field(boundField);
  return bindings.map((b) => {
    const text = b.to > b.from ? view.state.sliceDoc(b.from, b.to) : "";
    return { path: b.path, text, value: NUMBER.test(text.trim()) ? parseFloat(text) : NaN };
  });
}

/** Is any binding broken (deleted or no longer a number)? */
export function bindingsIntact(view: EditorView): boolean {
  return readBindings(view).every((b) => Number.isFinite(b.value));
}

/** Screen rect of a bound token, for the tab-switch morph. */
export function bindingRect(view: EditorView, path: string): DOMRect | null {
  const b = view.state.field(boundField).bindings.find((x) => x.path === path);
  if (!b) return null;
  const start = view.coordsAtPos(b.from);
  const end = view.coordsAtPos(b.to, -1);
  if (!start || !end) return null;
  return new DOMRect(start.left, start.top, Math.max(1, end.right - start.left), start.bottom - start.top);
}

/**
 * Listen for edits a person made (typing, pasting, dragging a number).
 * Knob-driven changes are ignored so state doesn't loop.
 */
export function onCodeEdit(cb: (view: EditorView) => void) {
  return EditorView.updateListener.of((u) => {
    if (!u.docChanged) return;
    if (u.transactions.every((tr) => tr.annotation(fromKnob))) return;
    cb(u.view);
  });
}

export const boundParams = [boundField];
