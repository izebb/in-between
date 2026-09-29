<script lang="ts">
  import { clone } from "~/lib/clone";
  /** L2 · Curve bench: a cubic-bézier editor with position and velocity side by side, plus A/B. */
  import { onDestroy } from "svelte";
  import { resolveMove, type EasingSpec } from "@inbetween/core";
  import { move as makeMove, type Scene, type Dialect } from "@inbetween/codegen";
  import Instrument from "./Instrument.svelte";
  import TimeBar from "./TimeBar.svelte";
  import CodePanel from "./CodePanel.svelte";
  import SandboxStage from "./SandboxStage.svelte";
  import Slider from "./controls/Slider.svelte";
  import Field from "./controls/Field.svelte";
  import CurveGraph from "../figures/CurveGraph.svelte";
  import VelocityGraph from "../figures/VelocityGraph.svelte";
  import SpacingTrack from "../figures/SpacingTrack.svelte";
  import { PlayheadTransport } from "~/lib/transport.svelte";
  import { cubicPresets, presetFor } from "~/lib/presets";
  import { LinkState } from "~/lib/link.svelte";
  import { readUrlState } from "~/lib/labstate";
  import { prefs } from "~/lib/prefs.svelte";
  import type { SandboxTransport } from "~/lib/sandbox/transport.svelte";

  export interface CurveState {
    scene: Scene;
    /** Preset id for B, or null for no comparison. */
    compare: string | null;
    dialect?: Dialect;
  }

  interface Props {
    preset?: Partial<CurveState>;
    embedded?: boolean;
    showCode?: boolean;
  }
  let { preset = {}, embedded = false, showCode = true }: Props = $props();

  const initial: CurveState = {
    scene: { title: "Curve bench", moves: [makeMove({ to: 320, duration: 600, easing: { type: "cubic", x1: 0.2, y1: 0.8, x2: 0.2, y2: 1 } })] },
    compare: null,
    dialect: "css",
    ...preset,
    ...((!embedded && readUrlState<CurveState>()) || {}),
  };
  // This is a bézier bench: linear arrives as its bézier, cubic-bezier(0, 0, 1, 1), so its handles can be pulled.
  function asBezier(st: CurveState): CurveState {
    for (const mv of st.scene.moves) if (mv.easing.type === "linear") mv.easing = { type: "cubic", x1: 0, y1: 0, x2: 1, y2: 1 };
    return st;
  }
  let lab = $state<CurveState>(asBezier(clone(initial)));
  let status = $state<"synced" | "edited" | "detached">("synced");
  let text = $state("");
  let running = $state(false);
  let sandboxTransport = $state<SandboxTransport | undefined>(undefined);
  const link = new LinkState();

  const m = $derived(lab.scene.moves[0]);
  const resolved = $derived(resolveMove(m));
  const bSpec = $derived<EasingSpec | null>(lab.compare ? (cubicPresets.find((p) => p.id === lab.compare)?.spec ?? null) : null);
  const model = new PlayheadTransport({ duration: resolved.end, hold: 700, autoplay: false });
  $effect(() => model.setDuration(resolved.end));
  $effect(() => {
    prefs.start();
    if (!prefs.reduced && !embedded) model.play();
  });
  onDestroy(() => model.destroy());
  $effect(() => {
    if (status !== "synced") running = true;
  });
  const transport = $derived(running && sandboxTransport ? sandboxTransport : model);
  const progress = $derived(Math.min(1, transport.time / resolved.duration));
  const current = $derived(presetFor(m.easing));

  function setHandle(k: "x1" | "y1" | "x2" | "y2", v: number) {
    const easing = lab.scene.moves[0].easing;
    if (easing.type === "cubic") easing[k] = v;
  }

  function choose(id: string) {
    const p = cubicPresets.find((x) => x.id === id);
    if (p) lab.scene.moves[0].easing = clone(p.spec);
  }

  const rows = $derived([
    { move: m, label: current?.label ?? "A" },
    ...(bSpec ? [{ move: { ...m, easing: bSpec }, label: `B · ${cubicPresets.find((p) => p.id === lab.compare)?.label ?? lab.compare}`, tone: "blue" as const }] : []),
  ]);
  const snapshot = $derived(JSON.parse(JSON.stringify(lab)));
  const e = $derived(m.easing.type === "cubic" ? m.easing : null);
</script>

{#snippet codeSnip()}
  <CodePanel bind:scene={lab.scene} bind:dialect={lab.dialect} {link} bind:status bind:text {running} onrun={() => (running = !running)} />
{/snippet}

<Instrument id="curve-bench" code="L2" name="Curve bench" {embedded} snapshot={snapshot} {link} codePanel={showCode ? codeSnip : undefined}>
  {#snippet params()}
    <div class="param-group">
      <span class="label">Presets</span>
      <div class="presets">
        {#each cubicPresets as p (p.id)}
          <button type="button" class="chip preset" aria-pressed={current?.id === p.id} title={p.note} onclick={() => choose(p.id)}>{p.label}</button>
        {/each}
      </div>
      {#if current?.note}<p class="note">{current.note}</p>{/if}
    </div>
    {#if e}
      <div class="param-group">
        <span class="label">Handles · velocity at start and end</span>
        <Slider label="x1" value={e.x1} min={0} max={1} step={0.01} link="0.easing.x1" onchange={(v) => setHandle("x1", v)} />
        <Slider label="y1" value={e.y1} min={-1} max={2} step={0.01} link="0.easing.y1" onchange={(v) => setHandle("y1", v)} />
        <Slider label="x2" value={e.x2} min={0} max={1} step={0.01} link="0.easing.x2" onchange={(v) => setHandle("x2", v)} />
        <Slider label="y2" value={e.y2} min={-1} max={2} step={0.01} link="0.easing.y2" onchange={(v) => setHandle("y2", v)} />
      </div>
    {/if}
    <div class="param-group">
      <Slider label="Duration" bind:value={lab.scene.moves[0].duration} min={100} max={2000} step={10} unit="ms" link="0.duration" />
      <Field label="Compare with B">
        <select class="select mono" value={lab.compare ?? ""} onchange={(ev) => (lab.compare = (ev.currentTarget as HTMLSelectElement).value || null)}>
          <option value="">none</option>
          {#each cubicPresets as p (p.id)}<option value={p.id}>{p.label}</option>{/each}
        </select>
      </Field>
    </div>
  {/snippet}

  {#snippet stage()}
    {#if running}
      <SandboxStage dialect={lab.dialect ?? "css"} code={text} targets={["box"]} duration={resolved.end} bind:transport={sandboxTransport} />
    {:else}
      <div class="bench-stage">
        <div class="graphs">
          <div class="graph">
            {#if m.easing.type === "cubic"}
              <CurveGraph bind:spec={lab.scene.moves[0].easing} compare={bSpec} {progress} height={250} />
            {:else}
              <CurveGraph spec={m.easing} compare={bSpec} {progress} height={250} editable={false} />
            {/if}
          </div>
          <div class="graph">
            <VelocityGraph spec={m.easing} compare={bSpec} {progress} height={250} />
          </div>
        </div>
        <SpacingTrack {rows} time={transport.time} chart={false} readout={false} ghosts="always" linked />
      </div>
    {/if}
  {/snippet}

  {#snippet time()}
    <TimeBar {transport} />
  {/snippet}
</Instrument>

<style>
  .bench-stage { padding: 1rem 1rem 0.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
  .graphs { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
  @media (max-width: 720px) { .graphs { grid-template-columns: 1fr; } }
  .presets { display: flex; flex-wrap: wrap; gap: 0.3rem; }
  .preset { cursor: pointer; }
  .preset:hover { color: var(--ink); border-color: var(--graphite); }
  .preset[aria-pressed="true"] { color: var(--ink); border-color: var(--ink); }
  .note { font-size: var(--text-sm); color: var(--graphite-strong); line-height: 1.45; }
  .select { width: 100%; font-size: var(--text-sm); padding: 0.3rem 0.4rem; border: 1px solid var(--rule); border-radius: 5px; background: var(--paper); color: var(--ink); }
</style>
