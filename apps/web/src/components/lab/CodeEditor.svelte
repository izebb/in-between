<script lang="ts">
  /** A plain editor for free code (Frame Stepper, Canvas Sandbox): pencil theme, draggable numbers. */
  import { onMount, onDestroy } from "svelte";
  import {
    EditorView,
    keymap,
    lineNumbers,
    EditorState,
    Compartment,
    defaultKeymap,
    history,
    historyKeymap,
    indentWithTab,
    cssLanguage as cssLang,
    jsLanguage as javascript,
  } from "@inbetween/editor";
  import { pencilTheme, pencilHighlight, dragNumbers } from "@inbetween/editor";

  interface Props {
    value: string;
    language?: "css" | "javascript";
    numbers?: boolean;
    onchange?: (v: string, isDrag: boolean) => void;
    label?: string;
  }
  let { value = $bindable(), language = "javascript", numbers = true, onchange, label = "Code" }: Props = $props();

  let host: HTMLDivElement;
  let view: EditorView | null = null;
  const lang = new Compartment();
  let internal = false;

  $effect(() => {
    const l = language;
    view?.dispatch({ effects: lang.reconfigure(l === "css" ? cssLang() : javascript()) });
  });

  $effect(() => {
    const v = value;
    if (!view || internal) return;
    if (v !== view.state.doc.toString()) view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: v } });
  });

  onMount(() => {
    view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: value,
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          lang.of(language === "css" ? cssLang() : javascript()),
          ...(numbers ? [lineNumbers()] : []),
          pencilTheme,
          pencilHighlight,
          EditorView.lineWrapping,
          dragNumbers(),
          EditorView.contentAttributes.of({ "aria-label": label }),
          EditorView.updateListener.of((u) => {
            if (!u.docChanged) return;
            internal = true;
            value = u.state.doc.toString();
            internal = false;
            onchange?.(value, u.transactions.some((tr) => tr.isUserEvent("input.drag")));
          }),
        ],
      }),
    });
  });
  onDestroy(() => view?.destroy());
</script>

<div class="code-editor" bind:this={host}></div>

<style>
  .code-editor { position: relative; height: 100%; min-height: 200px; }
  .code-editor :global(.cm-editor) { position: absolute; inset: 0; }
</style>
