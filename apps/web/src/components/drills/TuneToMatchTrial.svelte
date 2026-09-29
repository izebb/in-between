<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { fromResponse, resolveMove } from "@inbetween/core";
  import SpacingTrack from "../figures/SpacingTrack.svelte";
  import SpringGraph from "../figures/SpringGraph.svelte";
  import Slider from "../lab/controls/Slider.svelte";
  import { PlayheadTransport } from "~/lib/transport.svelte";
  import { toMove } from "~/lib/spec";
  import type { TuneSpec, TuneAnswer } from "~/lib/drills/tune-to-match";
  import type { Scored } from "~/lib/drills/types";
  import { prefs } from "~/lib/prefs.svelte";
  import PlayLabel from "./PlayLabel.svelte";

  let { spec, result, onanswer }: { spec: TuneSpec; result: Scored | null; onanswer: (v: TuneAnswer) => void } = $props();

  let response = $state(0.5);
  let bounce = $state(0.1);
  const target = $derived(fromResponse(spec.response, spec.bounce));
  const mine = $derived(fromResponse(response, bounce));
  const rows = $derived([
    { move: toMove({ easing: { type: "spring", ...target, velocity: 0 }, to: 300 }), label: "target", tone: "blue" as const },
    { move: toMove({ easing: { type: "spring", ...mine, velocity: 0 }, to: 300 }), label: "yours" },
  ]);
  const end = $derived(Math.max(...rows.map((r) => resolveMove(r.move).end)));
  const transport = new PlayheadTransport({ duration: 1000, hold: 500, loop: false });
  $effect(() => transport.setDuration(end));
  function play() {
    transport.restart();
    transport.play();
  }
  onMount(() => {
    prefs.start();
    if (!prefs.reduced) setTimeout(play, 350);
  });
  onDestroy(() => transport.destroy());
</script>

<div class="trial fig">
  <SpacingTrack {rows} time={transport.time} chart={false} readout={false} ghosts={result ? "always" : "none"} />
  {#if !result}
    <div class="knobs">
      <Slider label="Response" bind:value={response} min={0.15} max={1.2} step={0.01} unit="s" onchange={play} />
      <Slider label="Bounce" bind:value={bounce} min={-0.4} max={0.8} step={0.01} onchange={play} />
    </div>
    <div class="actions">
      <button class="btn ghost small" type="button" onclick={play}><PlayLabel what="both" /></button>
      <button class="btn solid" type="button" onclick={() => onanswer({ response, bounce })}>Submit</button>
    </div>
  {:else}
    <div class="fig" data-motion="fade">
      <SpringGraph springs={[{ params: mine }, { params: target, tone: "blue" }]} time={null} height={200} envelope={false} />
    </div>
  {/if}
</div>

<style>
  .trial { display: flex; flex-direction: column; gap: 0.8rem; }
  .knobs { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem 1.5rem; }
  @media (max-width: 520px) { .knobs { grid-template-columns: 1fr; } }
  .actions { display: flex; gap: 0.5rem; justify-content: flex-end; }
</style>
