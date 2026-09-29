/**
 * The pencil theme: graphite and ink, numbers in blue pencil.
 * All colours are CSS variables, so Paper and Lightbox both work without reconfiguring.
 */

import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

export const pencilTheme = EditorView.theme({
  "&": {
    color: "var(--ink)",
    backgroundColor: "transparent",
    fontSize: "12.5px",
    height: "100%",
  },
  ".cm-scroller": {
    fontFamily: "var(--font-mono)",
    lineHeight: "1.65",
    fontVariantNumeric: "tabular-nums",
  },
  ".cm-content": { padding: "12px 0", caretColor: "var(--ink)" },
  ".cm-line": { padding: "0 14px 0 12px" },
  "&.cm-focused": { outline: "none" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--ink)" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, ::selection": {
    backgroundColor: "color-mix(in srgb, var(--blue-pencil) 20%, transparent) !important",
  },
  ".cm-activeLine": { backgroundColor: "transparent" },
  ".cm-gutters": { backgroundColor: "transparent", border: "none", color: "var(--graphite)" },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 6px 0 10px", minWidth: "28px", fontSize: "11px" },
  // Bound parameters: the knobs, written as numbers.
  ".cm-bound": {
    textDecoration: "underline dotted",
    textDecorationColor: "color-mix(in srgb, var(--blue-pencil) 70%, transparent)",
    textUnderlineOffset: "3px",
    borderRadius: "2px",
  },
  ".cm-number-drag": { cursor: "ew-resize" },
  ".cm-dragging, .cm-dragging *": { cursor: "ew-resize !important", userSelect: "none" },
  ".cm-bound-hot": { backgroundColor: "color-mix(in srgb, var(--blue-pencil) 16%, transparent)" },
  ".cm-linked": { backgroundColor: "color-mix(in srgb, var(--blue-pencil) 7%, transparent)" },
  // Changed token: flashes in red pencil, then settles back.
  ".cm-flash": {
    animation: "ib-flash var(--dur-scene) var(--ease-out) both",
    borderRadius: "2px",
  },
});

export const pencilHighlight = syntaxHighlighting(
  HighlightStyle.define([
    { tag: [t.comment, t.lineComment, t.blockComment], color: "var(--code-comment)", fontStyle: "italic" },
    { tag: [t.keyword, t.controlKeyword, t.moduleKeyword, t.definitionKeyword, t.operatorKeyword], color: "var(--code-keyword)" },
    { tag: [t.number, t.integer, t.float, t.unit], color: "var(--code-number)" },
    { tag: [t.string, t.special(t.string)], color: "var(--code-string)" },
    { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "var(--code-fn)" },
    { tag: [t.propertyName, t.attributeName], color: "var(--code-prop)" },
    { tag: [t.className, t.tagName], color: "var(--ink)", fontWeight: "500" },
    { tag: [t.punctuation, t.bracket, t.separator, t.operator], color: "var(--code-punct)" },
    { tag: [t.atom, t.bool, t.null, t.constant(t.variableName)], color: "var(--code-keyword)" },
    { tag: t.variableName, color: "var(--ink)" },
  ]),
);
