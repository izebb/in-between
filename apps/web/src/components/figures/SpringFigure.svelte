<script lang="ts">
  /** Springs for chapters: the graph over real time, the motion it makes, and a time bar. */
  import { onDestroy } from "svelte";
  import { fromResponse, resolveMove, type SpringParams } from "@inbetween/core";
  import SpringGraph from "./SpringGraph.svelte";
  import SpacingTrack from "./SpacingTrack.svelte";
  import TimeBar from "../lab/TimeBar.svelte";
  import { PlayheadTransport } from "~/lib/transport.svelte";
  import { figurePlay } from "~/lib/figure.svelte";
  import { toMove } from "~/lib/spec";

  interface SpringInput {
    response?: number;
    bounce?: number;
    stiffness?: number;
    damping?: number;
    mass?: number;
    velocity?: number;
    label?: string;
  }
  let { springs, track = true, envelope = true, height = 240, stepper = true, readout = true }: { springs: SpringInput[]; track?: boolean; envelope?: boolean; height?: number; stepper?: boolean; readout?: boolean } = $props();

  const params = $derived<SpringParams[]>(
    springs.map((s) =>
      s.stiffness != null ? { stiffness: s.stiffness, damping: s.damping ?? 10, mass: s.mass ?? 1 } : fromResponse(s.response ?? 0.5, s.bounce ?? 0, s.mass ?? 1),
    ),
  );
  const rows = $derived(
    params.map((p, i) => ({
      move: toMove({ easing: { type: "spring", ...p, velocity: springs[i].velocity ?? 0 }, to: 320 }),
      label: springs[i].label ?? "",
      tone: i === 0 ? ("red" as const) : ("blue" as const),
    })),
  );
  const end = $derived(Math.max(...rows.map((r) => resolveMove(r.move).end)));
  const transport = new PlayheadTransport({ duration: 1000, hold: 700 });
  $effect(() => transport.setDuration(end));
  let still = $state(false);
  onDestroy(() => transport.destroy());
</script>

<div class="spring-figure" use:figurePlay={{ transport, onstill: (s) => (still = s) }}>
  <SpringGraph springs={params.map((p, i) => ({ params: p, velocity: springs[i].velocity, tone: i === 0 ? "red" : "blue" }))} time={still ? null : transport.time} {height} {envelope} {readout} />
  {#if track}
    <SpacingTrack {rows} time={still ? end : transport.time} chart={false} readout={false} ghosts={still ? "always" : "hover"} {still} />
  {/if}
  {#if stepper}<div class="tb"><TimeBar {transport} showMs={readout} /></div>{/if}
</div>

<style>
  .spring-figure { display: flex; flex-direction: column; gap: 0.75rem; }
  .tb { border-top: 1px solid var(--rule); padding-top: 0.6rem; }
</style>
