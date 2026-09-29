<script lang="ts">
  /** A timing curve (and optionally its velocity) with the motion it produces, for chapters. */
  import { onDestroy } from "svelte";
  import { resolveMove } from "@inbetween/core";
  import CurveGraph from "./CurveGraph.svelte";
  import VelocityGraph from "./VelocityGraph.svelte";
  import SpacingTrack from "./SpacingTrack.svelte";
  import TimeBar from "../lab/TimeBar.svelte";
  import { PlayheadTransport } from "~/lib/transport.svelte";
  import { parseSpec, toMove } from "~/lib/spec";
  import { figurePlay } from "~/lib/figure.svelte";

  interface Props {
    easing: string;
    compare?: string;
    duration?: number;
    velocity?: boolean;
    track?: boolean;
    stepper?: boolean;
    height?: number;
    label?: string;
    compareLabel?: string;
    xLabel?: string;
    yLabel?: string;
  }
  let { easing, compare, duration = 600, velocity = true, track = true, stepper = false, height = 220, label, compareLabel, xLabel, yLabel }: Props = $props();

  const spec = $derived(parseSpec(easing));
  const specB = $derived(compare ? parseSpec(compare) : null);
  const move = $derived(toMove({ easing: spec, duration, to: 360 }));
  const resolved = $derived(resolveMove(move));
  const transport = new PlayheadTransport({ duration: 1000, hold: 900 });
  $effect(() => transport.setDuration(resolved.end));
  let still = $state(false);
  const progress = $derived(still ? null : Math.min(1, transport.time / resolved.duration));
  const rows = $derived([
    { move, label: label ?? easing },
    ...(specB ? [{ move: toMove({ easing: specB, duration, to: 360 }), label: compareLabel ?? compare, tone: "blue" as const }] : []),
  ]);
  onDestroy(() => transport.destroy());
</script>

<div class="curve-figure" use:figurePlay={{ transport, onstill: (s) => (still = s) }}>
  <div class="graphs" class:single={!velocity}>
    <CurveGraph {spec} compare={specB} {progress} editable={false} {height} {xLabel} label={yLabel ?? "position"} />
    {#if velocity}<VelocityGraph {spec} compare={specB} {progress} {height} />{/if}
  </div>
  {#if track}
    <SpacingTrack {rows} time={still ? resolved.end : transport.time} chart={false} readout={false} ghosts={still ? "always" : "hover"} {still} />
  {/if}
  {#if stepper}<div class="tb"><TimeBar {transport} /></div>{/if}
</div>

<style>
  .curve-figure { display: flex; flex-direction: column; gap: 0.75rem; }
  .graphs { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  .graphs.single { grid-template-columns: minmax(0, 420px); justify-content: center; }
  @media (max-width: 640px) { .graphs { grid-template-columns: 1fr; } }
  .tb { border-top: 1px solid var(--rule); padding-top: 0.6rem; }
</style>
