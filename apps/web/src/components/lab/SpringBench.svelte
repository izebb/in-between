<script lang="ts">
  /**
   * L3 · Spring Bench: stiffness, damping, mass — or response and bounce, the designer's pair.
   * Live graph, settle time, and the spring compiled to CSS linear().
   */
  import { onDestroy } from "svelte";
  import { clone } from "~/lib/clone";
  import { resolveMove, fromResponse, toResponse, dampingRatio, springToLinear, type SpringParams } from "@inbetween/core";
  import { move as makeMove, type Scene, type Dialect } from "@inbetween/codegen";
  import Instrument from "./Instrument.svelte";
  import TimeBar from "./TimeBar.svelte";
  import CodePanel from "./CodePanel.svelte";
  import SandboxStage from "./SandboxStage.svelte";
  import Slider from "./controls/Slider.svelte";
  import Seg from "./controls/Seg.svelte";
  import Field from "./controls/Field.svelte";
  import SpringGraph from "../figures/SpringGraph.svelte";
  import SpacingTrack from "../figures/SpacingTrack.svelte";
  import { PlayheadTransport } from "~/lib/transport.svelte";
  import { springPresets } from "~/lib/presets";
  import { LinkState } from "~/lib/link.svelte";
  import { readUrlState } from "~/lib/labstate";
  import { prefs } from "~/lib/prefs.svelte";
  import type { SandboxTransport } from "~/lib/sandbox/transport.svelte";

  export interface SpringState {
    scene: Scene;
    mode: "physics" | "design";
    /** A second spring for comparison, by preset id. */
    compare: string | null;
    dialect?: Dialect;
  }
  interface Props {
    preset?: Partial<SpringState>;
    embedded?: boolean;
    showCode?: boolean;
  }
  let { preset = {}, embedded = false, showCode = true }: Props = $props();

  const soft = fromResponse(0.5, 0.15);
  const initial: SpringState = {
    scene: { title: "Spring bench", moves: [makeMove({ to: 320, easing: { type: "spring", ...soft, velocity: 0 } })] },
    mode: "design",
    compare: null,
    dialect: "css",
    ...preset,
    ...((!embedded && readUrlState<SpringState>()) || {}),
  };
  let lab = $state<SpringState>(clone(initial));
  let status = $state<"synced" | "edited" | "detached">("synced");
  let text = $state("");
  let running = $state(false);
  let sandboxTransport = $state<SandboxTransport | undefined>(undefined);
  const link = new LinkState();

  const m = $derived(lab.scene.moves[0]);
  const e = $derived(m.easing.type === "spring" ? m.easing : { type: "spring" as const, ...soft, velocity: 0 });
  const sp = $derived<SpringParams>({ stiffness: e.stiffness, damping: e.damping, mass: e.mass });
  const design = $derived(toResponse(sp));
  const zeta = $derived(dampingRatio(sp));
  const resolved = $derived(resolveMove(m));
  const css = $derived(springToLinear(sp, { velocity: e.velocity }));
  const compareParams = $derived.by(() => {
    const p = springPresets.find((x) => x.id === lab.compare);
    return p ? fromResponse(p.response, p.bounce) : null;
  });

  const model = new PlayheadTransport({ duration: resolved.end, hold: 700, autoplay: false });
  $effect(() => model.setDuration(Math.max(resolved.end, compareParams ? resolveMove({ ...m, easing: { type: "spring", ...compareParams } }).end : 0)));
  $effect(() => {
    prefs.start();
    if (!prefs.reduced && !embedded) model.play();
  });
  onDestroy(() => model.destroy());
  $effect(() => {
    if (status !== "synced") running = true;
  });
  const transport = $derived(running && sandboxTransport ? sandboxTransport : model);

  function setPhysics(k: "stiffness" | "damping" | "mass", v: number) {
    const easing = lab.scene.moves[0].easing;
    if (easing.type === "spring") easing[k] = v;
  }
  function setDesign(k: "response" | "bounce", v: number) {
    const cur = toResponse(sp);
    const next = fromResponse(k === "response" ? v : cur.response, k === "bounce" ? v : cur.bounce, sp.mass);
    const easing = lab.scene.moves[0].easing;
    if (easing.type === "spring") {
      easing.stiffness = +next.stiffness.toFixed(2);
      easing.damping = +next.damping.toFixed(2);
    }
  }
  function choose(id: string) {
    const p = springPresets.find((x) => x.id === id);
    if (!p) return;
    const q = fromResponse(p.response, p.bounce);
    lab.scene.moves[0].easing = { type: "spring", stiffness: +q.stiffness.toFixed(2), damping: +q.damping.toFixed(2), mass: 1, velocity: 0 };
  }
  const presetId = $derived(
    springPresets.find((p) => {
      const q = fromResponse(p.response, p.bounce);
      return Math.abs(q.stiffness - e.stiffness) < 0.6 && Math.abs(q.damping - e.damping) < 0.6 && Math.abs(e.mass - 1) < 1e-6;
    })?.id ?? null,
  );
  const character = $derived(zeta < 0.999 ? (zeta < 0.4 ? "underdamped · bouncy" : "underdamped · overshoots") : zeta < 1.001 ? "critically damped" : "overdamped · sluggish");

  const rows = $derived([
    { move: m, label: presetId ? `spring.${presetId}` : "spring" },
    ...(compareParams ? [{ move: { ...m, easing: { type: "spring" as const, ...compareParams, velocity: 0 } }, label: `B · ${lab.compare}`, tone: "blue" as const }] : []),
  ]);
  const snapshot = $derived(JSON.parse(JSON.stringify(lab)));
  let copied = $state(false);
  async function copyCss() {
    try {
      await navigator.clipboard.writeText(`transition: transform ${css.duration}ms ${css.easing};`);
      copied = true;
      setTimeout(() => (copied = false), 1400);
    } catch {
      /* ignore */
    }
  }
</script>

{#snippet codeSnip()}
  <CodePanel bind:scene={lab.scene} bind:dialect={lab.dialect} {link} bind:status bind:text {running} onrun={() => (running = !running)} />
{/snippet}

<Instrument id="spring-bench" code="L3" name="Spring Bench" {embedded} {snapshot} {link} codePanel={showCode ? codeSnip : undefined}>
  {#snippet params()}
    <div class="param-group">
      <span class="label">Presets</span>
      <div class="presets">
        {#each springPresets as p (p.id)}
          <button type="button" class="chip preset" aria-pressed={presetId === p.id} onclick={() => choose(p.id)}>{p.label}</button>
        {/each}
      </div>
    </div>
    <div class="param-group">
      <Field label="Describe it as">
        <Seg bind:value={lab.mode} options={[{ value: "design", label: "Response · bounce" }, { value: "physics", label: "k · c · m" }]} label="Parameters" />
      </Field>
      {#if lab.mode === "design"}
        <Slider label="Response" value={+design.response.toFixed(3)} min={0.08} max={2} step={0.01} unit="s" link="0.easing" hint="≈ one oscillation; lower is snappier" onchange={(v) => setDesign("response", v)} />
        <Slider label="Bounce" value={+design.bounce.toFixed(3)} min={-0.6} max={0.9} step={0.01} link="0.easing" hint="0 = no overshoot · < 0 = overdamped" onchange={(v) => setDesign("bounce", v)} />
      {:else}
        <Slider label="Stiffness k" value={e.stiffness} min={1} max={1000} step={1} link="0.easing.stiffness" onchange={(v) => setPhysics("stiffness", v)} />
        <Slider label="Damping c" value={e.damping} min={0} max={100} step={0.5} link="0.easing.damping" onchange={(v) => setPhysics("damping", v)} />
        <Slider label="Mass m" value={e.mass} min={0.1} max={10} step={0.1} link="0.easing.mass" onchange={(v) => setPhysics("mass", v)} />
      {/if}
    </div>
    <div class="param-group readouts mono">
      <span><span class="k">ζ</span> <b>{zeta.toFixed(2)}</b> · {character}</span>
      <span><span class="k">k c m</span> {e.stiffness.toFixed(0)} · {e.damping.toFixed(1)} · {e.mass.toFixed(1)}</span>
      <span><span class="k">response</span> {design.response.toFixed(2)}s · <span class="k">bounce</span> {design.bounce.toFixed(2)}</span>
      <span><span class="k">settles in</span> <b>{Math.round(resolved.duration)}ms</b></span>
    </div>
    <div class="param-group">
      <Field label="Compare with B">
        <select class="select mono" value={lab.compare ?? ""} onchange={(ev) => (lab.compare = (ev.currentTarget as HTMLSelectElement).value || null)}>
          <option value="">none</option>
          {#each springPresets as p (p.id)}<option value={p.id}>{p.label}</option>{/each}
        </select>
      </Field>
    </div>
  {/snippet}

  {#snippet stage()}
    {#if running}
      <SandboxStage dialect={lab.dialect ?? "css"} code={text} targets={["box"]} duration={resolved.end} bind:transport={sandboxTransport} />
    {:else}
      <div class="spring-stage">
        <SpringGraph springs={[{ params: sp, velocity: e.velocity }, ...(compareParams ? [{ params: compareParams, tone: "blue" as const }] : [])]} time={transport.time} height={240} />
        <SpacingTrack {rows} time={transport.time} chart={false} readout={false} ghosts="always" linked />
        <div class="export">
          <span class="smallcaps">CSS · linear() · {css.easing.split(",").length} stops · {css.duration}ms</span>
          <code class="mono">{css.easing.length > 120 ? css.easing.slice(0, 118) + "…" : css.easing}</code>
          <button class="btn ghost small" type="button" onclick={copyCss}>{copied ? "Copied" : "Copy"}</button>
        </div>
      </div>
    {/if}
  {/snippet}

  {#snippet time()}
    <TimeBar {transport} />
  {/snippet}
</Instrument>

<style>
  .spring-stage { padding: 1rem 1rem 0.75rem; display: flex; flex-direction: column; gap: 0.9rem; }
  .presets { display: flex; flex-wrap: wrap; gap: 0.3rem; }
  .preset { cursor: pointer; }
  .preset:hover { color: var(--ink); border-color: var(--graphite); }
  .preset[aria-pressed="true"] { color: var(--ink); border-color: var(--ink); }
  .readouts { display: flex; flex-direction: column; gap: 0.3rem; font-size: var(--text-xs); color: var(--graphite-strong); }
  .readouts b { color: var(--ink); font-weight: 500; }
  .readouts .k { color: var(--graphite); }
  .select { width: 100%; font-size: var(--text-sm); padding: 0.3rem 0.4rem; border: 1px solid var(--rule); border-radius: 5px; background: var(--paper); color: var(--ink); }
  .export { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; border-top: 1px solid var(--rule); padding-top: 0.6rem; }
  .export .smallcaps { color: var(--graphite-strong); }
  .export code { flex: 1; min-width: 12rem; font-size: var(--text-xs); color: var(--graphite-strong); background: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
