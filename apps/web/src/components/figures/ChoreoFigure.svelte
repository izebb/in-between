<script lang="ts">
  /** Choreography for chapters: several elements and their exposure sheet, playing on a shared clock. */
  import { onDestroy } from "svelte";
  import { resolveMove } from "@inbetween/core";
  import ChoreoStage from "./ChoreoStage.svelte";
  import XSheet from "./XSheet.svelte";
  import TimeBar from "../lab/TimeBar.svelte";
  import { PlayheadTransport } from "~/lib/transport.svelte";
  import { figurePlay } from "~/lib/figure.svelte";
  import { toMove, type MoveInput } from "~/lib/spec";

  interface Track extends MoveInput {
    target: string;
  }
  interface Props {
    tracks: Track[];
    layout?: "list" | "boxes" | "cards";
    sheet?: boolean;
    height?: number;
    /** Build a stagger: every target gets `stagger` ms more delay than the one before. */
    stagger?: number;
    /** Show ms on the time bar (hide before a chapter's FEEL). */
    readout?: boolean;
    /** Fixed time span for the sheet, ms, so two figures can share a scale. */
    span?: number;
  }
  let { tracks, layout = "list", sheet = true, height = 200, stagger, readout = true, span }: Props = $props();

  const moves = $derived.by(() => {
    const targets = [...new Set(tracks.map((t) => t.target))];
    return tracks.map((t) => toMove({ ...t, delay: (t.delay ?? 0) + (stagger ? targets.indexOf(t.target) * stagger : 0) }, { to: 0 }));
  });
  const end = $derived(Math.max(...moves.map((m) => resolveMove(m).end)));
  const transport = new PlayheadTransport({ duration: 1000, hold: 900 });
  $effect(() => transport.setDuration(end));
  let still = $state(false);
  $effect(() => {
    if (still) transport.seek(end);
  });
  onDestroy(() => transport.destroy());
</script>

<div class="choreo-figure" use:figurePlay={{ transport, onstill: (s) => (still = s) }}>
  <ChoreoStage {moves} time={still ? end : transport.time} {layout} selected={null} {height} />
  {#if sheet}
    <div class="sheet"><XSheet {moves} time={still ? end : transport.time} editable={false} selected={-1} {span} onscrub={(ms) => transport.seek(ms)} /></div>
  {/if}
  <div class="tb"><TimeBar {transport} showMs={readout} /></div>
</div>

<style>
  .choreo-figure { display: flex; flex-direction: column; gap: 0.6rem; }
  .sheet { border-top: 1px solid var(--rule); padding-top: 0.6rem; }
  .tb { border-top: 1px solid var(--rule); padding-top: 0.6rem; }
</style>
