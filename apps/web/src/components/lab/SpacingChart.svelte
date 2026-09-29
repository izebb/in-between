<script lang="ts">
  import { clone } from "~/lib/clone";
  /** L1 · Spacing chart: an object's positions per frame, as ghosts and as an animator's tick chart. */
  import { onDestroy } from "svelte";
  import { resolveMove, frameCount, fromResponse, type EasingSpec } from "@inbetween/core";
  import { move as makeMove, type Scene, type Dialect } from "@inbetween/codegen";
  import Instrument from "./Instrument.svelte";
  import TimeBar from "./TimeBar.svelte";
  import CodePanel from "./CodePanel.svelte";
  import SandboxStage from "./SandboxStage.svelte";
  import Slider from "./controls/Slider.svelte";
  import Seg from "./controls/Seg.svelte";
  import Field from "./controls/Field.svelte";
  import SpacingTrack from "../figures/SpacingTrack.svelte";
  import CurveGraph from "../figures/CurveGraph.svelte";
  import { PlayheadTransport } from "~/lib/transport.svelte";
  import { cubicPresets, springPresets, presetFor } from "~/lib/presets";
  import { LinkState } from "~/lib/link.svelte";
  import { readUrlState } from "~/lib/labstate";
  import { prefs } from "~/lib/prefs.svelte";
  import type { SandboxTransport } from "~/lib/sandbox/transport.svelte";

  export interface SpacingState {
    scene: Scene;
    fps: number;
    compare: boolean;
    dialect?: Dialect;
  }

  interface Props {
    preset?: Partial<SpacingState>;
    embedded?: boolean;
    showCode?: boolean;
  }
  let { preset = {}, embedded = false, showCode = true }: Props = $props();

  const initial: SpacingState = {
    scene: { title: "Spacing chart", moves: [makeMove({ to: 360, duration: 400, easing: { type: "cubic", x1: 0.2, y1: 0.8, x2: 0.2, y2: 1 } })] },
    fps: 60,
    compare: false,
    dialect: "css",
    ...preset,
    ...((!embedded && readUrlState<SpacingState>()) || {}),
  };

  let lab = $state<SpacingState>(clone(initial));
  let status = $state<"synced" | "edited" | "detached">("synced");
  let text = $state("");
  let running = $state(false);
  let sandboxTransport = $state<SandboxTransport | undefined>(undefined);
  const link = new LinkState();

  const m = $derived(lab.scene.moves[0]);
  const resolved = $derived(resolveMove(m));
  const model = new PlayheadTransport({ duration: resolved.end, hold: 700, fps: lab.fps, autoplay: false });
  $effect(() => model.setDuration(resolved.end));
  $effect(() => model.setFps(lab.fps));
  $effect(() => {
    prefs.start();
    if (!prefs.reduced && !embedded) model.play();
  });
  onDestroy(() => model.destroy());

  $effect(() => {
    if (status !== "synced") running = true;
  });

  const transport = $derived(running && sandboxTransport ? sandboxTransport : model);

  const presetId = $derived(
    m.easing.type === "spring" ? `spring:${springPresets.find((p) => {
      const q = fromResponse(p.response, p.bounce);
      return m.easing.type === "spring" && Math.abs(q.stiffness - m.easing.stiffness) < 0.5 && Math.abs(q.damping - m.easing.damping) < 0.5;
    })?.id ?? "custom"}` : m.easing.type === "steps" ? "steps" : m.easing.type === "linear" ? "linear" : (presetFor(m.easing)?.id ?? "custom"),
  );

  function choose(id: string) {
    let e: EasingSpec | null = null;
    if (id.startsWith("spring:")) {
      const p = springPresets.find((x) => `spring:${x.id}` === id);
      if (p) e = { type: "spring", ...fromResponse(p.response, p.bounce), velocity: 0 };
    } else if (id === "steps") e = { type: "steps", steps: 6, position: "jump-end" };
    else e = clone(cubicPresets.find((p) => p.id === id)?.spec ?? null) as EasingSpec | null;
    if (e) lab.scene.moves[0].easing = e;
  }

  const rows = $derived([
    { move: m, label: m.easing.type === "spring" ? "spring" : m.easing.type === "steps" ? "steps" : (cubicPresets.find((p) => p.id === presetId)?.label ?? "custom") },
    ...(lab.compare ? [{ move: { ...m, easing: { type: "linear" as const } }, label: "linear", tone: "blue" as const }] : []),
  ]);
  const frames = $derived(frameCount(resolved.duration, lab.fps));
  const snapshot = $derived(JSON.parse(JSON.stringify(lab)));
</script>

{#snippet codeSnip()}
  <CodePanel bind:scene={lab.scene} bind:dialect={lab.dialect} {link} bind:status bind:text {running} onrun={() => (running = !running)} />
{/snippet}

<Instrument id="spacing-chart" code="L1" name="Spacing chart" {embedded} snapshot={snapshot} {link} codePanel={showCode ? codeSnip : undefined}>
  {#snippet params()}
    <div class="param-group">
      <Field label="Curve" link="0.easing">
        <select class="select mono" value={presetId} onchange={(e) => choose((e.currentTarget as HTMLSelectElement).value)}>
          <optgroup label="Cubic">
            {#each cubicPresets as p (p.id)}<option value={p.id}>{p.label}</option>{/each}
            {#if presetId === "custom"}<option value="custom">custom</option>{/if}
          </optgroup>
          <optgroup label="Spring">
            {#each springPresets as p (p.id)}<option value={`spring:${p.id}`}>{p.label}</option>{/each}
            {#if presetId === "spring:custom"}<option value="spring:custom">custom spring</option>{/if}
          </optgroup>
          <optgroup label="Other">
            <option value="steps">steps(6)</option>
          </optgroup>
        </select>
      </Field>
      {#if m.easing.type !== "spring"}
        <Slider label="Duration" bind:value={lab.scene.moves[0].duration} min={50} max={2000} step={10} unit="ms" link="0.duration" hint={`${frames} frames at ${lab.fps}fps`} />
      {:else}
        <span class="hint mono">Springs set their own duration: {Math.round(resolved.duration)}ms, {frames} frames.</span>
      {/if}
      <Slider label="Distance" bind:value={lab.scene.moves[0].to} min={40} max={600} step={10} unit="px" link="0.to" />
    </div>
    <div class="param-group">
      <Field label="Frame rate">
        <Seg bind:value={lab.fps} options={[{ value: 12, label: "12" }, { value: 24, label: "24" }, { value: 30, label: "30" }, { value: 60, label: "60" }, { value: 120, label: "120" }]} label="Frame rate" />
      </Field>
      <label class="check"><input type="checkbox" bind:checked={lab.compare} /> Compare with linear</label>
    </div>
    <p class="note">Wide gaps read as fast, tight gaps as slow. The ticks are the same thing an animator pencils on the side of a key drawing.</p>
  {/snippet}

  {#snippet stage()}
    {#if running}
      <SandboxStage dialect={lab.dialect ?? "css"} code={text} targets={lab.scene.moves.map((x) => x.target).filter((v, i, a) => a.indexOf(v) === i)} duration={resolved.end} bind:transport={sandboxTransport} fps={lab.fps} ghostEvery={Math.max(1, Math.round(60 / lab.fps))} />
    {:else}
      <div class="stage-inner">
        <SpacingTrack {rows} time={transport.time} fps={lab.fps} still={prefs.reduced && !transport.playing && transport.time === 0} linked />
        <div class="mini-curve">
          <CurveGraph spec={m.easing} compare={lab.compare ? { type: "linear" } : null} progress={Math.min(1, transport.time / resolved.duration)} editable={false} height={170} />
        </div>
      </div>
    {/if}
  {/snippet}

  {#snippet time()}
    <TimeBar {transport} />
  {/snippet}
</Instrument>

<style>
  .stage-inner { padding: 1.5rem 1rem 1rem; display: flex; flex-direction: column; justify-content: center; gap: 1.5rem; min-height: 100%; }
  .mini-curve { max-width: 420px; width: 100%; align-self: center; }
  .select { width: 100%; font-size: var(--text-sm); padding: 0.3rem 0.4rem; border: 1px solid var(--rule); border-radius: 5px; background: var(--paper); color: var(--ink); }
  .hint { font-size: var(--text-xs); color: var(--graphite-strong); }
  .check { display: flex; align-items: center; gap: 0.45rem; font-size: var(--text-sm); color: var(--graphite-strong); }
  .check input { accent-color: var(--ink); }
  .note { font-size: var(--text-sm); color: var(--graphite-strong); line-height: 1.5; margin-top: auto; }
</style>
