<script lang="ts">
  /**
   * L4 · Exposure sheet: keyframes, offsets and staggers across several elements.
   * Who leads, who follows, and how much they overlap.
   */
  import { onDestroy } from "svelte";
  import { clone } from "~/lib/clone";
  import { resolveMove, type Move, type EasingSpec, type Property } from "@inbetween/core";
  import type { Scene, Dialect } from "@inbetween/codegen";
  import Instrument from "./Instrument.svelte";
  import TimeBar from "./TimeBar.svelte";
  import CodePanel from "./CodePanel.svelte";
  import SandboxStage from "./SandboxStage.svelte";
  import Slider from "./controls/Slider.svelte";
  import Seg from "./controls/Seg.svelte";
  import Field from "./controls/Field.svelte";
  import XSheet from "../figures/XSheet.svelte";
  import ChoreoStage from "../figures/ChoreoStage.svelte";
  import { PlayheadTransport } from "~/lib/transport.svelte";
  import { cubicPresets, springPresets, presetFor } from "~/lib/presets";
  import { fromResponse } from "@inbetween/core";
  import { LinkState } from "~/lib/link.svelte";
  import { readUrlState } from "~/lib/labstate";
  import { prefs } from "~/lib/prefs.svelte";
  import { parseSpec } from "~/lib/spec";
  import type { SandboxTransport } from "~/lib/sandbox/transport.svelte";

  export interface SheetState {
    scene: Scene;
    layout: "list" | "boxes" | "cards";
    stagger: number;
    order: "first" | "last" | "center";
    /** The property the stagger tool arranges. */
    staggerProp: Property;
    selected: number;
    dialect?: Dialect;
  }

  const row = (target: string, property: Property, from: number, to: number, duration: number, delay: number, easing: string): Move => ({
    target, property, from, to, duration, delay, easing: parseSpec(easing),
  });

  const PRESETS: Record<string, { label: string; state: Partial<SheetState> }> = {
    list: {
      label: "List enter",
      state: {
        layout: "list", stagger: 40, order: "first", staggerProp: "y",
        scene: { title: "List enter", moves: ["a", "b", "c", "d", "e"].flatMap((t, i) => [row(t, "y", 20, 0, 360, i * 40, "--ease-out"), row(t, "opacity", 0, 1, 240, i * 40, "linear")]) },
      },
    },
    overlap: {
      label: "Overlap",
      state: {
        layout: "boxes", stagger: 60, order: "first", staggerProp: "x",
        scene: { title: "Follow-through and overlap", moves: [
          row("lead", "x", 0, 260, 420, 0, "--ease-inout"),
          row("f1", "x", 0, 260, 440, 60, "spring(response .45 bounce .2)"),
          row("f2", "x", 0, 260, 460, 120, "spring(response .5 bounce .25)"),
        ] },
      },
    },
    unison: {
      label: "All at once",
      state: {
        layout: "list", stagger: 0, order: "first", staggerProp: "y",
        scene: { title: "Everything at once", moves: ["a", "b", "c", "d", "e"].flatMap((t) => [row(t, "y", 20, 0, 360, 0, "--ease-out"), row(t, "opacity", 0, 1, 240, 0, "linear")]) },
      },
    },
    cascade: {
      label: "Cascade",
      state: {
        layout: "cards", stagger: 50, order: "center", staggerProp: "scale",
        // A ripple from card e (the grid's lower middle): one step per card between, as centre out spaces it.
        scene: { title: "Cascade: a ripple from one card", moves: ["a", "b", "c", "d", "e", "f"].map((t, i) => row(t, "scale", 0.6, 1, 420, [100, 50, 100, 50, 0, 50][i], "spring(response .4 bounce .25)")) },
      },
    },
  };

  interface Props {
    preset?: Partial<SheetState> & { use?: string };
    embedded?: boolean;
    showCode?: boolean;
  }
  let { preset = {}, embedded = false, showCode = true }: Props = $props();

  const fromUrl = (!embedded && readUrlState<Partial<SheetState> & { use?: string }>()) || {};
  const base = PRESETS[fromUrl.use ?? preset.use ?? "list"]?.state ?? PRESETS.list.state;
  const initial: SheetState = {
    selected: 0,
    dialect: "css",
    ...(base as SheetState),
    ...preset,
    ...fromUrl,
  };
  let lab = $state<SheetState>(clone(initial));
  // A preset or link that sets the stagger step gets its delays re-spaced to match.
  if ((preset.stagger ?? fromUrl.stagger) != null && !(fromUrl as { scene?: unknown }).scene) queueMicrotask(() => applyStagger());
  let status = $state<"synced" | "edited" | "detached">("synced");
  let text = $state("");
  let running = $state(false);
  let sandboxTransport = $state<SandboxTransport | undefined>(undefined);
  const link = new LinkState();

  const end = $derived(Math.max(...lab.scene.moves.map((m) => resolveMove(m).end)));
  const model = new PlayheadTransport({ duration: end, hold: 800, autoplay: false });
  $effect(() => model.setDuration(end));
  $effect(() => {
    prefs.start();
    if (!prefs.reduced && !embedded) model.play();
  });
  onDestroy(() => model.destroy());
  $effect(() => {
    if (status !== "synced") running = true;
  });
  const transport = $derived(running && sandboxTransport ? sandboxTransport : model);

  const sel = $derived(lab.scene.moves[lab.selected] ?? lab.scene.moves[0]);
  const targets = $derived([...new Set(lab.scene.moves.map((m) => m.target))]);

  function patch(i: number, p: Partial<Move>) {
    Object.assign(lab.scene.moves[i], p);
  }

  /** Re-space delays of every track with the stagger property. */
  function applyStagger() {
    const ts = targets;
    const n = ts.length;
    // Centre out: a list spreads both ways from its middle; the cards (a grid of three columns) ripple
    // from the card nearest the middle, one step per card between (on a tie, the later card leads).
    const middle = (i: number) => Math.abs(i - (n - 1) / 2);
    let ripple = (i: number) => middle(i);
    if (lab.layout === "cards") {
      const rows = Math.ceil(n / 3);
      const cell = (i: number) => [i % 3, Math.floor(i / 3)];
      const off = (i: number) => Math.hypot(cell(i)[0] - 1, cell(i)[1] - (rows - 1) / 2);
      const origin = ts.reduce((best, _, i) => (off(i) <= off(best) ? i : best), 0);
      ripple = (i) => Math.abs(cell(i)[0] - cell(origin)[0]) + Math.abs(cell(i)[1] - cell(origin)[1]);
    }
    const rank = (i: number) => (lab.order === "first" ? i : lab.order === "last" ? n - 1 - i : ripple(i));
    lab.scene.moves.forEach((m) => {
      const i = ts.indexOf(m.target);
      if (i >= 0 && (m.property === lab.staggerProp || lab.scene.moves.filter((x) => x.target === m.target).length > 1)) m.delay = Math.round(rank(i) * lab.stagger);
    });
  }

  function usePreset(id: string) {
    const p = clone(PRESETS[id].state) as SheetState;
    lab.scene = p.scene;
    lab.layout = p.layout;
    lab.stagger = p.stagger;
    lab.order = p.order;
    lab.staggerProp = p.staggerProp;
    lab.selected = 0;
    model.restart();
  }

  const easingId = $derived(
    sel.easing.type === "spring"
      ? `spring:${springPresets.find((p) => { const q = fromResponse(p.response, p.bounce); return sel.easing.type === "spring" && Math.abs(q.stiffness - sel.easing.stiffness) < 0.6; })?.id ?? "custom"}`
      : sel.easing.type === "linear" ? "linear" : (presetFor(sel.easing)?.id ?? "custom"),
  );
  function chooseEasing(id: string) {
    let e: EasingSpec | null = null;
    if (id === "linear") e = { type: "linear" };
    else if (id.startsWith("spring:")) {
      const p = springPresets.find((x) => `spring:${x.id}` === id);
      if (p) e = { type: "spring", ...fromResponse(p.response, p.bounce), velocity: 0 };
    } else e = clone(cubicPresets.find((p) => p.id === id)?.spec ?? null);
    if (e) lab.scene.moves[lab.selected].easing = e;
  }
  const snapshot = $derived(JSON.parse(JSON.stringify(lab)));
  const range = (p: Property): [number, number, number] => (p === "opacity" ? [0, 1, 0.01] : p === "scale" ? [0, 2, 0.01] : p === "rotate" ? [-360, 360, 1] : [-300, 300, 1]);
</script>

{#snippet codeSnip()}
  <CodePanel bind:scene={lab.scene} bind:dialect={lab.dialect} {link} bind:status bind:text {running} onrun={() => (running = !running)} />
{/snippet}

<Instrument id="exposure-sheet" code="L4" name="Exposure sheet" {embedded} {snapshot} {link} codePanel={showCode ? codeSnip : undefined}>
  {#snippet params()}
    <div class="param-group">
      <span class="label">Start from</span>
      <div class="presets">
        {#each Object.entries(PRESETS) as [id, p] (id)}
          <button type="button" class="chip preset" onclick={() => usePreset(id)}>{p.label}</button>
        {/each}
      </div>
    </div>
    <div class="param-group">
      <span class="label">Stagger · {lab.staggerProp}</span>
      <Slider label="Step" bind:value={lab.stagger} min={0} max={200} step={5} unit="ms" hint={lab.stagger <= 40 ? "reads as one gesture" : lab.stagger <= 80 ? "a visible cascade" : "a wait"} onchange={applyStagger} />
      <Seg bind:value={lab.order} options={[{ value: "first", label: "first →" }, { value: "last", label: "← last" }, { value: "center", label: "centre out" }]} label="Order" onchange={applyStagger} />
    </div>
    <div class="param-group">
      <span class="label">Track · {sel.target} · {sel.property}</span>
      <Field label="Easing" link={`${lab.selected}.easing`}>
        <select class="select mono" value={easingId} onchange={(e) => chooseEasing((e.currentTarget as HTMLSelectElement).value)}>
          <option value="linear">linear</option>
          {#each cubicPresets.filter((p) => p.id !== "linear") as p (p.id)}<option value={p.id}>{p.label}</option>{/each}
          {#each springPresets as p (p.id)}<option value={`spring:${p.id}`}>{p.label}</option>{/each}
          {#if easingId.endsWith("custom")}<option value={easingId}>custom</option>{/if}
        </select>
      </Field>
      <Slider label="Delay" value={sel.delay} min={0} max={1500} step={5} unit="ms" link={`${lab.selected}.delay`} onchange={(v) => patch(lab.selected, { delay: v })} />
      {#if sel.easing.type !== "spring"}
        <Slider label="Duration" value={sel.duration} min={20} max={2000} step={10} unit="ms" link={`${lab.selected}.duration`} onchange={(v) => patch(lab.selected, { duration: v })} />
      {/if}
      <Slider label="From" value={sel.from} min={range(sel.property)[0]} max={range(sel.property)[1]} step={range(sel.property)[2]} link={`${lab.selected}.from`} onchange={(v) => patch(lab.selected, { from: v })} />
      <Slider label="To" value={sel.to} min={range(sel.property)[0]} max={range(sel.property)[1]} step={range(sel.property)[2]} link={`${lab.selected}.to`} onchange={(v) => patch(lab.selected, { to: v })} />
    </div>
    <div class="param-group">
      <Field label="Elements">
        <Seg bind:value={lab.layout} options={[{ value: "list", label: "list" }, { value: "boxes", label: "boxes" }, { value: "cards", label: "cards" }]} label="Layout" />
      </Field>
    </div>
  {/snippet}

  {#snippet stage()}
    {#if running}
      <SandboxStage dialect={lab.dialect ?? "css"} code={text} {targets} duration={end} bind:transport={sandboxTransport} />
    {:else}
      <div class="sheet-stage">
        <ChoreoStage moves={lab.scene.moves} time={transport.time} layout={lab.layout} selected={lab.selected} height={230} />
        <div class="x">
          <span class="smallcaps">Exposure sheet · drag a bar to offset it, its edge to stretch it</span>
          <XSheet moves={lab.scene.moves} time={transport.time} bind:selected={lab.selected} onchange={patch} onscrub={(ms) => transport.seek(ms)} />
        </div>
      </div>
    {/if}
  {/snippet}

  {#snippet time()}
    <TimeBar {transport} />
  {/snippet}
</Instrument>

<style>
  .sheet-stage { display: flex; flex-direction: column; gap: 0.5rem; padding-bottom: 0.75rem; }
  .x { padding: 0.5rem 1rem 0; border-top: 1px solid var(--rule); display: flex; flex-direction: column; gap: 0.5rem; }
  .x .smallcaps { color: var(--graphite-strong); }
  .presets { display: flex; flex-wrap: wrap; gap: 0.3rem; }
  .preset { cursor: pointer; }
  .preset:hover { color: var(--ink); border-color: var(--graphite); }
  .select { width: 100%; font-size: var(--text-sm); padding: 0.3rem 0.4rem; border: 1px solid var(--rule); border-radius: 5px; background: var(--paper); color: var(--ink); }
</style>
