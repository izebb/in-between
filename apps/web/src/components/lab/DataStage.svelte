<script lang="ts">
  /**
   * L10 · Data stage: a chart that moves between states — sort, filter, regroup, update.
   * Swap how bars are matched to data (keep identity or not), the stagger, the staging; draw it in SVG
   * or on a Canvas. Scrub the transition on the time bar. Click a bar to follow one datum through the move.
   * A change that arrives mid-move retargets: it starts from where every bar is on screen.
   */
  import { onDestroy, untrack } from "svelte";
  import Instrument from "./Instrument.svelte";
  import TimeBar from "./TimeBar.svelte";
  import Slider from "./controls/Slider.svelte";
  import Seg from "./controls/Seg.svelte";
  import Field from "./controls/Field.svelte";
  import DataChart from "../figures/DataChart.svelte";
  import { effectiveDuration, springToLinear, type EasingSpec } from "@inbetween/core";
  import { PlayheadTransport } from "~/lib/transport.svelte";
  import { STATES, EXIT_FRACTION, layout, snapshot, transition, type Layout, type StateId, type Frame } from "~/lib/datastage";
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
  const frame = $derived<Frame>({ width: Math.max(220, w), height: 300, padL: 30, padB: 22, padT: 18 });
  const st = (id: StateId) => STATES.find((s) => s.id === id)!;
  const spec = $derived(parseSpec(lab.easing));
  // A spring runs for its own settle time; the Duration knob only sets a tween's length.
  const dur = $derived(effectiveDuration(spec, lab.duration));
  /** Where the bars were when a change interrupted a move: the next transition starts there. */
  let snap = $state.raw<Layout | null>(null);
  const tr = $derived(
    transition(snap ?? layout(st(lab.from), frame), layout(st(lab.to), frame), frame, {
      duration: dur,
      stagger: lab.stagger,
      easing: spec,
      keying: lab.keying,
      staging: lab.staging,
    }),
  );
  const transport = new PlayheadTransport({ duration: 1000, hold: 900, loop: false });
  $effect(() => transport.setDuration(tr.total));
  onDestroy(() => transport.destroy());

  function run() {
    transport.setDuration(tr.total);
    transport.restart();
    // Reduced motion: each change is a cut to the new state; Play on the time bar still shows the move.
    if (prefs.reduced) transport.seek(tr.total);
    else transport.play();
  }

  function go(id: StateId) {
    if (id === lab.to) return;
    // Mid-move (or scrubbed part-way): start from the frame on screen, never from the last state's end.
    const t = transport.time;
    const from = t < tr.total - 1 ? snapshot(tr.at(t), lab.keying) : null;
    lab.from = lab.to;
    lab.to = id;
    snap = from;
    untrack(run);
  }

  // Settings changes replay the current transition from its named start, so you can see the difference.
  // The first run is the mount: the stage starts playing once it is well in view.
  let mounted = false;
  $effect(() => {
    void lab.keying;
    void lab.staging;
    void lab.stagger;
    void lab.duration;
    void lab.easing;
    untrack(() => {
      snap = null;
      if (mounted) run();
      else {
        mounted = true;
        transport.restart();
      }
    });
  });

  /** Play the opening transition once, when most of the chart is on screen (at once on the lab page). */
  function autoplay(node: HTMLElement) {
    prefs.start();
    if (prefs.reduced) return;
    if (!embedded) {
      transport.play();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        if (!prefs.reduced && transport.time === 0 && !transport.playing) transport.play();
      },
      { threshold: 0.6 },
    );
    io.observe(node);
    return { destroy: () => io.disconnect() };
  }

  const marks = $derived(tr.at(transport.time));
  const settled = $derived(transport.time >= tr.total - 1);
  const max = $derived(layout(st(lab.to), frame).max);
  const snapshotState = $derived(JSON.parse(JSON.stringify(lab)));
  const EASINGS = [
    { id: "--ease-inout", label: "ease-in-out" },
    { id: "linear", label: "linear" },
    { id: "--ease-out", label: "ease-out" },
    { id: "spring(response .5 bounce .5)", label: "bouncy spring" },
  ];

  // ---- the transition as code: FLIP with the Web Animations API, valid as printed
  const round = (v: number) => +v.toFixed(3);
  function cssEasing(e: EasingSpec): string {
    if (e.type === "cubic") return `cubic-bezier(${round(e.x1)}, ${round(e.y1)}, ${round(e.x2)}, ${round(e.y2)})`;
    if (e.type === "spring") return springToLinear(e).easing;
    return "linear";
  }
  const code = $derived.by(() => {
    const byId = lab.keying === "data";
    const key = byId ? "d.id" : "i";
    const staged = lab.staging === "staged";
    const exitMs = Math.round(dur * EXIT_FRACTION);
    return [
      ...(byId
        ? ["// Matched by datum id: every bar", "// keeps its identity.", "// rows: the new state, in order.", "// bars: a Map from datum id to its bar."]
        : ["// Matched by position: bar i becomes", "// whatever is i-th now.", "// rows: the new state, in order.", "// bars: an array of bars, left to right."]),
      "// .bar { position: absolute; bottom: 0;",
      "//        transform-origin: bottom left }",
      "const x = scaleBand()",
      `  .domain(rows.map((d${byId ? "" : ", i"}) => ${key}))`,
      "  .range([0, width])",
      "  .padding(0.22);",
      "const y = scaleLinear()",
      "  .domain([0, max])",
      "  .range([0, height]);",
      ...(staged
        ? [
            "",
            `// Staged: what leaves sinks first (${exitMs}ms),`,
            "// then the moves, then the enters.",
            byId
              ? "const exiting = [...bars.keys()]\n  .some((id) => !rows.some((d) => d.id === id));"
              : "const exiting = bars.length > rows.length;",
            `const moveAt = exiting ? ${exitMs} : 0;`,
          ]
        : []),
      "",
      "rows.forEach((d, i) => {",
      byId ? "  // the same bar as before" : "  // whatever sat at this index",
      `  const bar = ${byId ? "bars.get(d.id)" : "bars[i]"};`,
      "  if (!bar) return; // a new one enters apart",
      "  // First: where it is now",
      "  const was = bar.getBoundingClientRect();",
      "  // Last: where its datum belongs",
      `  bar.style.left = \`\${x(${key})}px\`;`,
      "  bar.style.width = `${x.bandwidth()}px`;",
      "  bar.style.height = `${y(d.value)}px`;",
      "  const now = bar.getBoundingClientRect();",
      "  // Invert, then play",
      "  const dx = was.left - now.left;",
      "  const sx = was.width / now.width;",
      "  const sy = was.height / (now.height || 1);",
      "  bar.animate(",
      "    [",
      "      { transform: `translateX(${dx}px) scale(${sx}, ${sy})` },",
      "      { transform: 'none' },",
      "    ],",
      "    {",
      `      duration: ${dur},`,
      `      delay: ${staged ? "moveAt + " : ""}i * ${lab.stagger},`,
      `      easing: '${cssEasing(spec)}',`,
      "      fill: 'backwards',",
      "    },",
      "  );",
      "});",
    ].join("\n");
  });
</script>

{#snippet codeSnip()}
  <div class="code-col">
    <div class="code-head"><span class="smallcaps">The moves, as code · d3-scale + WAAPI</span></div>
    <pre class="mono">{code}</pre>
  </div>
{/snippet}

<Instrument id="data-stage" code="L10" name="Data stage" {embedded} snapshot={snapshotState} codePanel={embedded ? undefined : codeSnip}>
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
      <Field label="Match bars by">
        <Seg bind:value={lab.keying} options={[{ value: "data", label: "Datum (key)" }, { value: "index", label: "Position (index)" }]} label="Match bars by" />
      </Field>
      <Field label="Staging">
        <Seg bind:value={lab.staging} options={[{ value: "together", label: "Together" }, { value: "staged", label: "Exit · move · enter" }]} label="Staging" />
      </Field>
      <Slider label="Stagger" bind:value={lab.stagger} min={0} max={120} step={5} unit="ms" />
      <Slider label="Duration" bind:value={lab.duration} min={100} max={2000} step={20} unit="ms" hint={spec.type === "spring" ? `A spring sets its own time: ${dur}ms.` : undefined} />
      <Field label="Easing">
        <select class="select mono" bind:value={lab.easing}>
          {#each EASINGS as e (e.id)}<option value={e.id}>{e.label}</option>{/each}
        </select>
      </Field>
      <Field label="Draw with">
        <Seg bind:value={lab.renderer} options={[{ value: "svg", label: "SVG" }, { value: "canvas", label: "Canvas" }]} label="Renderer" />
      </Field>
    </div>
    <p class="note">Click a bar to follow it. Matched by position, watch it turn into someone else.</p>
  {/snippet}

  {#snippet stage()}
    <div class="data-stage" use:resize={(width) => (w = width - 32)} use:autoplay>
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
  .code-head { padding: 0.7rem 0.75rem 0.7rem calc(0.75rem + var(--code-head-start, 0px)); border-bottom: 1px solid var(--rule); }
  .code-head .smallcaps { color: var(--graphite-strong); }
  pre { margin: 0; padding: 0.8rem 0.9rem; font-size: 11.5px; line-height: 1.6; white-space: pre-wrap; color: var(--ink); overflow: auto; }
</style>
