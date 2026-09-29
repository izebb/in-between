/**
 * Draggable numbers: scrub any number in the code horizontally, like a slider.
 * A press that doesn't move is still a click (it places the cursor).
 */

import { EditorView, ViewPlugin, Decoration, type DecorationSet, type ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

export interface DragNumberOptions {
  /** Step for a number at this position (e.g. from a bound param's spec). Return null to infer. */
  stepAt?: (view: EditorView, from: number, to: number) => number | null;
  /** Pixels of pointer travel per step. */
  pixelsPerStep?: number;
  /** Called once when a drag starts and when it ends. */
  onDrag?: (active: boolean) => void;
}

const NUM_RE = /-?(?:\d+\.?\d*|\.\d+)/g;

function numberAt(view: EditorView, pos: number): { from: number; to: number; text: string } | null {
  const line = view.state.doc.lineAt(pos);
  NUM_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NUM_RE.exec(line.text))) {
    const from = line.from + m.index;
    const to = from + m[0].length;
    // Skip digits glued to identifiers (e.g. "ease0", "h1").
    const before = line.text[m.index - 1];
    if (before && /[A-Za-z_$]/.test(before)) continue;
    if (pos >= from && pos <= to) return { from, to, text: m[0] };
  }
  return null;
}

const decimalsOf = (s: string) => (s.includes(".") ? s.split(".")[1].length : 0);

function inferStep(text: string): number {
  const d = decimalsOf(text);
  if (d === 0) return Math.abs(parseFloat(text)) >= 100 ? 5 : 1;
  return Math.pow(10, -Math.max(2, d));
}

function format(v: number, decimals: number): string {
  const s = v.toFixed(decimals);
  const t = decimals ? s.replace(/0+$/, "").replace(/\.$/, "") : s;
  return t === "-0" ? "0" : t;
}

/** Cursor affordance: numbers show ew-resize. */
const numberMarks = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.viewportChanged) this.decorations = this.build(u.view);
    }
    build(view: EditorView) {
      const b = new RangeSetBuilder<Decoration>();
      const mark = Decoration.mark({ class: "cm-number-drag" });
      for (const { from, to } of view.visibleRanges) {
        const text = view.state.sliceDoc(from, to);
        NUM_RE.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = NUM_RE.exec(text))) {
          const before = text[m.index - 1];
          if (before && /[A-Za-z_$#]/.test(before)) continue;
          b.add(from + m.index, from + m.index + m[0].length, mark);
        }
      }
      return b.finish();
    }
  },
  { decorations: (v) => v.decorations },
);

export function dragNumbers(opts: DragNumberOptions = {}) {
  const ppx = opts.pixelsPerStep ?? 3;
  let lastPress = { at: 0, from: -1 };
  return [
    numberMarks,
    EditorView.domEventHandlers({
      dblclick(e, view) {
        // Select the whole number so typing replaces it.
        const pos = view.posAtCoords({ x: e.clientX, y: e.clientY }, false);
        const hit = numberAt(view, pos);
        if (!hit) return false;
        e.preventDefault();
        view.dispatch({ selection: { anchor: hit.from, head: hit.to } });
        view.focus();
        return true;
      },
      pointerdown(e, view) {
        if (e.button !== 0 || e.shiftKey || e.metaKey || e.ctrlKey) return false;
        const pos = view.posAtCoords({ x: e.clientX, y: e.clientY }, false);
        const target = e.target as HTMLElement;
        if (!target.closest(".cm-number-drag")) return false;
        const hit = numberAt(view, pos);
        if (!hit) return false;
        e.preventDefault();
        // A second press on the same number within 400ms selects it, so typing replaces it.
        const now = performance.now();
        if (now - lastPress.at < 400 && lastPress.from === hit.from) {
          lastPress = { at: 0, from: -1 };
          view.dispatch({ selection: { anchor: hit.from, head: hit.to } });
          view.focus();
          return true;
        }
        lastPress = { at: now, from: hit.from };
        const startX = e.clientX;
        const startVal = parseFloat(hit.text);
        const step = opts.stepAt?.(view, hit.from, hit.to) ?? inferStep(hit.text);
        const decimals = Math.max(decimalsOf(hit.text), step < 1 ? Math.ceil(-Math.log10(step) - 1e-9) : 0);
        let range = { from: hit.from, to: hit.to };
        let dragging = false;
        const el = view.dom;
        el.setPointerCapture?.(e.pointerId);

        const move = (ev: PointerEvent) => {
          const dx = ev.clientX - startX;
          if (!dragging && Math.abs(dx) < 3) return;
          if (!dragging) {
            dragging = true;
            el.classList.add("cm-dragging");
            opts.onDrag?.(true);
          }
          const mult = ev.altKey ? 0.1 : ev.shiftKey ? 10 : 1;
          const v = startVal + Math.round(dx / ppx) * step * mult;
          const text = format(v, decimals);
          if (text === view.state.sliceDoc(range.from, range.to)) return;
          view.dispatch({
            changes: { from: range.from, to: range.to, insert: text },
            userEvent: "input.drag",
          });
          range = { from: range.from, to: range.from + text.length };
        };
        const up = (ev: PointerEvent) => {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerup", up);
          el.removeEventListener("pointercancel", up);
          el.releasePointerCapture?.(ev.pointerId);
          if (dragging) {
            el.classList.remove("cm-dragging");
            opts.onDrag?.(false);
          } else {
            // A click: place the cursor where it landed.
            view.dispatch({ selection: { anchor: pos } });
            view.focus();
          }
        };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerup", up);
        el.addEventListener("pointercancel", up);
        return true;
      },
    }),
  ];
}
