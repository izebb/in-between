<script lang="ts">
  /**
   * The code panel: code as a live instrument (§2.1).
   *  - knob → code: only the changed tokens are rewritten, and they flash in red pencil
   *  - code → knob: type or drag any bound number and the knobs follow
   *  - tabs are dialects of the same state; shared numbers glide across on switch
   *  - hover a line to light what it controls; hover the stage to light the lines
   *  - edit freely: the code then runs as written in the sandboxed stage
   */
  import { onMount, onDestroy, tick } from "svelte";
  import {
    EditorView,
    keymap,
    EditorState,
    Compartment,
    defaultKeymap,
    history,
    historyKeymap,
    indentWithTab,
    cssLanguage as cssLang,
    jsLanguage as javascript,
  } from "@inbetween/editor";
  import {
    pencilTheme,
    pencilHighlight,
    boundParams,
    boundField,
    setBindings,
    setHotGroup,
    fromKnob,
    readBindings,
    bindingRect,
    dragNumbers,
    tokenFlash,
    flash,
    linkHover,
    setLinked,
  } from "@inbetween/editor";
  import {
    DIALECTS,
    generate,
    diffCode,
    setPath,
    getPath,
    paramSpec,
    fmt,
    type Scene,
    type Dialect,
    type Code,
  } from "@inbetween/codegen";
  import { tokenMorph } from "~/motion/patterns";
  import type { LinkState } from "~/lib/link.svelte";

  type Status = "synced" | "edited" | "detached";

  interface Props {
    scene: Scene;
    dialect?: Dialect;
    dialects?: Dialect[];
    link?: LinkState;
    status?: Status;
    text?: string;
    /** Stage is showing the code running in the browser sandbox. */
    running?: boolean;
    onrun?: () => void;
  }

  let {
    scene = $bindable(),
    dialect = $bindable("css"),
    dialects = DIALECTS.map((d) => d.id),
    link,
    status = $bindable("synced"),
    text = $bindable(""),
    running = false,
    onrun,
  }: Props = $props();

  let host: HTMLDivElement;
  let morphLayer: HTMLDivElement;
  let view: EditorView | null = null;
  const lang = new Compartment();
  let current: Code | null = null;
  let skeleton = "";
  let lastJSON = "";
  let codeJSON = "";
  let resyncTimer: ReturnType<typeof setTimeout> | null = null;
  let copied = $state(false);
  let morphing = $state(false);

  const langFor = (d: Dialect) => (d === "css" ? cssLang() : javascript());
  const cmBindings = (c: Code) => c.bindings.map((b) => ({ path: b.path, from: b.from, to: b.to }));
  const metaFor = (path: string) => current?.bindings.find((b) => b.path === path);

  /** The code with every bound number cut out: equal skeletons = only numbers changed. */
  function skeletonOf(doc: string, ranges: { from: number; to: number }[]) {
    let out = "";
    let at = 0;
    for (const r of [...ranges].sort((a, b) => a.from - b.from)) {
      out += doc.slice(at, r.from) + "\u0000";
      at = r.to;
    }
    return out + doc.slice(at);
  }

  function rewrite(next: Code, flashIt: boolean) {
    if (!view) return;
    const old = view.state.doc.toString();
    const { edits, changed } = diffCode(old, next.text);
    view.dispatch({
      changes: edits,
      annotations: fromKnob.of(true),
      effects: setBindings.of(cmBindings(next)),
    });
    current = next;
    skeleton = skeletonOf(next.text, next.bindings);
    status = "synced";
    text = next.text;
    if (flashIt && changed.length) flash(view, changed);
  }

  /** Knobs changed while the code has hand edits: patch only the bound numbers. */
  function patchBound(s: Scene) {
    if (!view) return;
    const { bindings } = view.state.field(boundField);
    const changes: { from: number; to: number; insert: string }[] = [];
    const flashes: { from: number; to: number }[] = [];
    let shift = 0;
    for (const b of [...bindings].sort((a, b) => a.from - b.from)) {
      const meta = metaFor(b.path);
      const v = getPath(s, b.path);
      if (!meta || v === undefined || b.to <= b.from) continue;
      const want = fmt(v * meta.scale, meta.decimals);
      const have = view.state.sliceDoc(b.from, b.to);
      if (parseFloat(have) === parseFloat(want)) continue;
      changes.push({ from: b.from, to: b.to, insert: want });
      flashes.push({ from: b.from + shift, to: b.from + shift + want.length });
      shift += want.length - (b.to - b.from);
    }
    if (!changes.length) return;
    view.dispatch({ changes, annotations: fromKnob.of(true) });
    text = view.state.doc.toString();
    flash(view, flashes);
  }

  // knob → code
  $effect(() => {
    const json = JSON.stringify(scene);
    if (!view || json === lastJSON) return;
    lastJSON = json;
    if (json === codeJSON) return; // came from the code itself
    if (status === "synced") rewrite(generate(dialect, scene), true);
    else if (status === "edited") patchBound(scene);
  });

  // code → knob
  function onUserEdit(isDrag: boolean) {
    if (!view) return;
    const doc = view.state.doc.toString();
    text = doc;
    const reads = readBindings(view);
    if (reads.some((r) => !Number.isFinite(r.value))) {
      status = "detached";
      return;
    }
    let next = scene;
    for (const r of reads) {
      const meta = metaFor(r.path);
      if (!meta) continue;
      const v = r.value / meta.scale;
      const spec = paramSpec(r.path);
      if (v < spec.min || v > spec.max) continue;
      if (getPath(next, r.path) !== v) next = setPath(next, r.path, v);
    }
    const { bindings } = view.state.field(boundField);
    const clean = skeletonOf(doc, bindings) === skeleton;
    status = clean ? "synced" : "edited";
    const json = JSON.stringify(next);
    if (json !== JSON.stringify(scene)) {
      codeJSON = json;
      scene = next;
    }
    if (clean) {
      // Only numbers changed: let derived text (spring linear(), durations) catch up.
      if (resyncTimer) clearTimeout(resyncTimer);
      const run = () => {
        resyncTimer = null;
        if (!view || status !== "synced") return;
        const gen = generate(dialect, scene);
        if (gen.text !== view.state.doc.toString()) rewrite(gen, true);
        else {
          current = gen;
          skeleton = skeletonOf(gen.text, gen.bindings);
        }
      };
      if (isDrag) run();
      else resyncTimer = setTimeout(run, 900);
    }
  }

  async function switchDialect(next: Dialect) {
    if (!view || next === dialect) return;
    const before = new Map<string, { rect: DOMRect; text: string }>();
    for (const b of view.state.field(boundField).bindings) {
      const r = bindingRect(view, b.path);
      if (r) before.set(b.path, { rect: r, text: view.state.sliceDoc(b.from, b.to) });
    }
    dialect = next;
    const gen = generate(next, scene);
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: gen.text },
      annotations: fromKnob.of(true),
      effects: [lang.reconfigure(langFor(next)), setBindings.of(cmBindings(gen))],
    });
    current = gen;
    skeleton = skeletonOf(gen.text, gen.bindings);
    status = "synced";
    text = gen.text;
    view.scrollDOM.scrollTop = 0;
    await tick();
    const pairs: { text: string; from: DOMRect; to: DOMRect }[] = [];
    const seen = new Set<string>();
    for (const b of gen.bindings) {
      if (seen.has(b.path)) continue;
      const old = before.get(b.path);
      const to = bindingRect(view, b.path);
      if (old && to && to.top > 0) {
        seen.add(b.path);
        pairs.push({ text: gen.text.slice(b.from, b.to), from: old.rect, to });
      }
    }
    morphing = true;
    await tokenMorph(morphLayer, pairs);
    morphing = false;
  }

  function reset() {
    if (resyncTimer) clearTimeout(resyncTimer);
    status = "synced";
    rewrite(generate(dialect, scene), true);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(view?.state.doc.toString() ?? "");
      copied = true;
      setTimeout(() => (copied = false), 1400);
    } catch {
      /* clipboard blocked */
    }
  }

  // stage/knob → code lines
  $effect(() => {
    const g = link?.group ?? null;
    const src = link?.source;
    if (!view) return;
    if (src === "code") return;
    view.dispatch({ effects: [setLinked.of(g), setHotGroup.of(g)] });
  });

  onMount(() => {
    current = generate(dialect, scene);
    skeleton = skeletonOf(current.text, current.bindings);
    lastJSON = JSON.stringify(scene);
    text = current.text;
    view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: current.text,
        extensions: [
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
          lang.of(langFor(dialect)),
          pencilTheme,
          pencilHighlight,
          EditorView.lineWrapping,
          boundParams,
          tokenFlash,
          dragNumbers({
            stepAt: (v, from, to) => {
              const b = v.state.field(boundField).bindings.find((x) => x.from === from && x.to === to);
              if (!b) return null;
              const meta = metaFor(b.path);
              return paramSpec(b.path).step * (meta?.scale ?? 1);
            },
          }),
          linkHover({
            targetsFor: (i) => current?.lines[i]?.targets ?? [],
            onHover: (ts) => {
              if (!link) return;
              if (!ts) return link.set(null, "code");
              link.set(ts.find((t) => t.includes(".")) ?? ts[0], "code");
            },
          }),
          EditorView.updateListener.of((u) => {
            if (!u.docChanged) return;
            if (u.transactions.every((tr) => tr.annotation(fromKnob))) return;
            onUserEdit(u.transactions.some((tr) => tr.isUserEvent("input.drag")));
          }),
        ],
      }),
    });
    view.dispatch({ effects: setBindings.of(cmBindings(current)) });
  });

  onDestroy(() => {
    if (resyncTimer) clearTimeout(resyncTimer);
    view?.destroy();
  });

  const labelOf = (d: Dialect) => DIALECTS.find((x) => x.id === d)?.label ?? d;
</script>

<div class="code-panel" class:morphing>
  <div class="cp-head">
    <div class="seg tabs" role="tablist" aria-label="Notation">
      {#each dialects as d (d)}
        <button type="button" role="tab" aria-selected={dialect === d} onclick={() => switchDialect(d)}>{labelOf(d)}</button>
      {/each}
    </div>
    <div class="cp-actions">
      <button class="btn ghost small" type="button" onclick={copy}>{copied ? "Copied" : "Copy"}</button>
    </div>
  </div>
  <div class="cp-editor" bind:this={host}>
    <div class="morph-layer" bind:this={morphLayer} aria-hidden="true"></div>
  </div>
  <div class="cp-foot">
    <span class="status smallcaps" data-status={status}>
      {#if status === "synced"}Bound to the knobs · drag any number
      {:else if status === "edited"}Edited · numbers still bound
      {:else}Detached · runs as written{/if}
    </span>
    <span class="foot-actions">
      {#if status !== "synced"}<button class="btn ghost small" type="button" onclick={reset}>Reset</button>{/if}
      {#if onrun}
        <button class="btn small" type="button" aria-pressed={running} onclick={onrun} title="Run this code in a sandboxed browser stage and measure it">
          {running ? "Model" : "Run in browser"}
        </button>
      {/if}
    </span>
  </div>
</div>

<style>
  .code-panel { display: flex; flex-direction: column; height: 100%; min-height: 0; position: relative; }
  .cp-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.6rem 0.6rem 0.5rem 0.75rem; border-bottom: 1px solid var(--rule); }
  .tabs { flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
  .cp-editor { position: relative; flex: 1; min-height: 220px; overflow: hidden; }
  .cp-editor :global(.cm-editor) { height: 100%; position: absolute; inset: 0; }
  .morph-layer { position: absolute; inset: 0; pointer-events: none; z-index: 5; }
  .morph-layer :global(.token-ghost) {
    position: absolute;
    font-family: var(--font-mono);
    font-size: 12.5px;
    line-height: 1.65;
    color: var(--red-pencil);
    white-space: pre;
    font-variant-numeric: tabular-nums;
  }
  .morphing :global(.cm-bound) { color: transparent !important; }
  .cp-foot { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.45rem 0.6rem 0.45rem 0.75rem; border-top: 1px solid var(--rule); min-height: 38px; }
  .status { color: var(--graphite-strong); }
  .status[data-status="edited"], .status[data-status="detached"] { color: var(--ink); }
  .foot-actions { display: flex; gap: 0.3rem; }
</style>
