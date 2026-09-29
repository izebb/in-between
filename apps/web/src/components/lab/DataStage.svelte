<script lang="ts">
  /**
   * L10 · Data stage: a chart that moves between states — sort, filter, regroup, update.
   * Swap the interpolation (keep identity or not), the stagger, the staging; draw it in SVG or on a Canvas.
   * Scrub the transition on the time bar. Click a bar to follow one datum through the move.
   */
  import { onDestroy, untrack } from "svelte";
  import Instrument from "./Instrument.svelte";
  import TimeBar from "./TimeBar.svelte";
  import Slider from "./controls/Slider.svelte";
  import Seg from "./controls/Seg.svelte";
  import Field from "./controls/Field.svelte";
  import DataChart from "../figures/DataChart.svelte";
  import { PlayheadTransport } from "~/lib/transport.svelte";
  import { STATES, layout, transition, type StateId, type Frame } from "~/lib/datastage";
  import { parseSpec } from "~/lib/spec";
  import { readUrlState } from "~/lib/labstate";
  import { prefs } from "~/lib/prefs.svelte";
  import { resize } from "~/lib/actions";

  export interface DataStageState {
    from: StateId;
    to: StateId;
    duration: number;
    stagger: number;
    easing: string;
    keying: "data" | "index";
    staging: "together" | "staged";
    renderer: "svg" | "canvas";
    tracked: string | null;
  }
  interface Props {
    preset?: Partial<DataStageState>;
    embedded?: boolean;
  }
  let { preset = {}, embedded = false }: Props = $props();

  let lab = $state<DataStageState>({
    from: "a-z",
    to: "by-value",
    duration: 600,
    stagger: 30,
    easing: "--ease-inout",
    keying: "data",
    staging: "together",
    renderer: "svg",
    tracked: "h",
    ...preset,
    ...((!embedded && readUrlState<DataStageState>()) || {}),
  });

  let w = $state(640);
  const frame = $derived<Frame>({ width: Math.max(300, w), height: 300, padL: 30, padB: 22, padT: 18 });
  const st = (id: StateId) => STATES.find((s) => s.id === id)!;
  const tr = $derived(
    transition(layout(st(lab.from), frame), layout(st(lab.to), frame), frame, {
      duration: lab.duration,
      stagger: lab.stagger,
      easing: parseSpec(lab.easing),
      keying: lab.keying,
      staging: lab.staging,
    }),
  );
  const transport = new PlayheadTransport({ duration: 1000, hold: 900, loop: false });
  $effect(() => transport.setDuration(tr.total));
  onDestroy(() => transport.destroy());

  function go(id: StateId) {
    if (id === lab.to) return;
    lab.from = lab.to;
    lab.to = id;
    untrack(() => {
      transport.restart();
      if (prefs.reduced) transport.seek(tr.total);
      else transport.play();
    });
  }
  // Settings changes replay the current transition so you can see the difference.
  $effect(() => {
    void lab.keying;
    void lab.staging;
    void lab.stagger;
    void lab.duration;
    void lab.easing;
    untrack(() => {
      transport.restart();
      if (!prefs.reduced) transport.play();
    });
  });

  const marks = $derived(tr.at(transport.time));
  const settled = $derived(transport.time >= tr.total - 1);
  const max = $derived(layout(st(lab.to), frame).max);
  const snapshot = $derived(JSON.parse(JSON.stringify(lab)));
  const EASINGS = [
    { id: "--ease-inout", label: "ease-in-out" },
    { id: "linear", label: "linear" },
    { id: "--ease-out", label: "ease-out" },
    { id: "spring(response .5 bounce .5)", label: "bouncy spring" },
  ];

  const code = $derived(`// Keyed by ${lab.keying === "data" ? "datum id: every bar keeps its identity" : "index: bar i becomes whatever is i next"}
const x = scaleBand().domain(rows.map((d) => d.${lab.keying === "data" ? "id" : "index"})).range([0, width]).padding(0.22);
const y = scaleLinear().domain([0, max]).range([height, 0]);

rows.forEach((d, i) => {
  const bar = bars.get(d.${lab.keying === "data" ? "id" : "index"});    // ${lab.keying === "data" ? "the same mark as before" : "whatever sat at this index"}
  const from = bar.getBBox();
  const to = { x: x(d.${lab.keying === "data" ? "id" : "index"}), y: y(d.value), height: y(0) - y(d.value) };
  bar.animate(
    [{ transform: \`translate(\${from.x - to.x}px, 0)\` }, { transform: 'none' }],
    { duration: ${lab.duration}, delay: ${lab.staging === "staged" ? `${Math.round(lab.duration * 0.6)} + ` : ""}i * ${lab.stagger}, easing: '${lab.easing.startsWith("--") ? `var(${lab.easing})` : lab.easing}', fill: 'both' },
  );
});`);
</script>

{#snippet codeSnip()}
  <div class="code-col">
    <div class="code-head"><span class="smallcaps">The transition, as code · d3-scale + WAAPI</span></div>
    <pre class="mono">{code}</pre>
  </div>
{/snippet}

<Instrument id="data-stage" code="L10" name="Data stage" {embedded} {snapshot} codePanel={embedded ? undefined : codeSnip}>
  {#snippet params()}
    <div class="param-group">
      <span class="label">Go to</span>
      <div class="states">
        {#each STATES as s (s.id)}
          <button type="button" class="chip st" aria-pressed={lab.to === s.id} onclick={() => go(s.id)}>{s.label}</button>
        {/each}
      </div>
    </div>
    <div class="param-group">
      <Field label="Interpolate">
        <Seg bind:value={lab.keying} options={[{ value: "data", label: "Data (by id)" }, { value: "index", label: "Pixels (by index)" }]} label="Keying" />
      </Field>
      <Field label="Staging">
        <Seg bind:value={lab.staging} options={[{ value: "together", label: "Together" }, { value: "staged", label: "Exit · move · enter" }]} label="Staging" />
      </Field>
      <Slider label="Stagger" bind:value={lab.stagger} min={0} max={120} step={5} unit="ms" />
      <Slider label="Duration" bind:value={lab.duration} min={100} max={2000} step={20} unit="ms" />
      <Field label="Easing">
        <select class="select mono" bind:value={lab.easing}>
          {#each EASINGS as e (e.id)}<option value={e.id}>{e.label}</option>{/each}
        </select>
      </Field>
      <Field label="Draw with">
        <Seg bind:value={lab.renderer} options={[{ value: "svg", label: "SVG" }, { value: "canvas", label: "Canvas" }]} label="Renderer" />
      </Field>
    </div>
    <p class="note">Click a bar to follow it. With pixels keying, watch it turn into someone else.</p>
  {/snippet}

  {#snippet stage()}
    <div class="data-stage" use:resize={(width) => (w = width - 32)}>
      <DataChart {marks} {frame} {max} renderer={lab.renderer} tracked={lab.tracked} {settled} ontrack={(id) => (lab.tracked = id)} />
    </div>
  {/snippet}

  {#snippet time()}
    <TimeBar {transport} />
  {/snippet}
</Instrument>

<style>
  .data-stage { padding: 1.25rem 1rem 1rem; }
  .states { display: flex; flex-wrap: wrap; gap: 0.3rem; }
  .st { cursor: pointer; }
  .st:hover { color: var(--ink); border-color: var(--graphite); }
  .st[aria-pressed="true"] { color: var(--ink); border-color: var(--ink); }
  .select { width: 100%; font-size: var(--text-sm); padding: 0.3rem 0.4rem; border: 1px solid var(--rule); border-radius: 5px; background: var(--paper); color: var(--ink); }
  .note { font-size: var(--text-sm); color: var(--graphite-strong); line-height: 1.45; }
  .code-col { display: flex; flex-direction: column; height: 100%; }
  .code-head { padding: 0.7rem 0.75rem; border-bottom: 1px solid var(--rule); }
  .code-head .smallcaps { color: var(--graphite-strong); }
  pre { margin: 0; padding: 0.8rem 0.9rem; font-size: 11.5px; line-height: 1.6; white-space: pre-wrap; color: var(--ink); overflow: auto; }
</style>
