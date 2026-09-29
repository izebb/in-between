<script lang="ts">
  /**
   * A live spacing chart for chapters. Plays while on screen; the onion skin shows on hover.
   * Still (reduced motion or the plate's Still toggle): the ghosts and ticks stay, the dot rests.
   */
  import { onDestroy } from "svelte";
  import { resolveMove } from "@inbetween/core";
  import SpacingTrack from "./SpacingTrack.svelte";
  import TimeBar from "../lab/TimeBar.svelte";
  import { PlayheadTransport } from "~/lib/transport.svelte";
  import { toMove, type MoveInput } from "~/lib/spec";
  import { figurePlay } from "~/lib/figure.svelte";

  interface RowInput extends MoveInput {
    label?: string;
    tone?: "red" | "blue";
  }
  interface Props {
    rows: RowInput[];
    fps?: number;
    ghosts?: "always" | "hover" | "none";
    chart?: boolean;
    stepper?: boolean;
    object?: "dot" | "square";
    readout?: boolean;
    hold?: number;
    /** Default travel for rows that don't set `to`. */
    distance?: number;
  }
  let { rows, fps = 60, ghosts = "hover", chart = true, stepper = true, object = "dot", readout = true, hold = 900, distance = 360 }: Props = $props();

  const built = $derived(rows.map((r) => ({ move: toMove(r, { to: distance }), label: r.label, tone: r.tone })));
  const end = $derived(Math.max(...built.map((b) => resolveMove(b.move).end)));
  const transport = new PlayheadTransport({ duration: 1000, hold, fps });
  $effect(() => transport.setDuration(end));
  let still = $state(false);
  onDestroy(() => transport.destroy());
</script>

<div class="spacing-figure" use:figurePlay={{ transport, onstill: (s) => (still = s) }}>
  <SpacingTrack rows={built} time={still ? end : transport.time} {fps} {still} ghosts={still ? "always" : ghosts} {chart} {object} {readout} />
  {#if stepper}
    <div class="tb"><TimeBar {transport} /></div>
  {/if}
</div>

<style>
  .spacing-figure { display: flex; flex-direction: column; gap: 0.75rem; }
  .tb { border-top: 1px solid var(--rule); padding-top: 0.6rem; }
</style>
