<script lang="ts">
  import { onMount } from "svelte";
  import Mock from "../figures/Mock.svelte";
  import SpacingTrack from "../figures/SpacingTrack.svelte";
  import type { GuessDurationSpec } from "~/lib/drills/guess-duration";
  import type { Scored } from "~/lib/drills/types";
  import { toMove } from "~/lib/spec";
  import { prefs } from "~/lib/prefs.svelte";
  import PlayLabel from "./PlayLabel.svelte";

  let { spec, result, onanswer }: { spec: GuessDurationSpec; result: Scored | null; onanswer: (v: number) => void } = $props();

  let mock: Mock;
  let guess = $state(400);
  const bands = [100, 200, 300, 500, 800, 1200];

  onMount(() => {
    prefs.start();
    if (prefs.reduced) return;
    // It is about to play: hold its first frame, so the move starts clean instead of from its end state.
    mock?.cue();
    setTimeout(() => mock?.play(), 350);
  });

  const rows = $derived(
    result
      ? [
          { move: toMove({ easing: spec.easing, duration: spec.duration, to: 300 }), label: `truth · ${spec.duration}ms` },
          { move: toMove({ easing: spec.easing, duration: result.answer, to: 300 }), label: `you · ${result.answer}ms`, tone: "blue" as const },
        ]
      : [],
  );
</script>

<div class="trial">
  <div class="stage">
    <Mock bind:this={mock} kind={spec.kind} motion={{ easing: spec.easing, duration: spec.duration }} height={170} label="A move to time" />
    <button class="btn small replay" type="button" onclick={() => mock.play()}><PlayLabel /></button>
  </div>
  {#if !result}
    <form class="answer" onsubmit={(e) => { e.preventDefault(); onanswer(guess); }}>
      <div class="bands">
        {#each bands as b (b)}<button type="button" class="chip" aria-pressed={guess === b} onclick={() => (guess = b)}>{b}</button>{/each}
      </div>
      <div class="row">
        <input type="range" min="50" max="1500" step="10" bind:value={guess} aria-label="Your estimate in milliseconds" />
        <span class="mono val"><b>{guess}</b>ms · {Math.round((guess / 1000) * 60)} fr</span>
        <button class="btn solid" type="submit">Answer</button>
      </div>
    </form>
  {:else}
    <div class="reveal fig" data-motion="fade">
      <SpacingTrack {rows} time={0} still chart={false} readout={false} ghosts="always" />
    </div>
  {/if}
</div>

<style>
  .trial { display: flex; flex-direction: column; gap: 1rem; }
  .stage { position: relative; }
  .replay { position: absolute; right: 0.5rem; top: 0.5rem; background: var(--paper); }
  .answer { display: flex; flex-direction: column; gap: 0.6rem; }
  .bands { display: flex; flex-wrap: wrap; gap: 0.3rem; }
  .bands .chip { cursor: pointer; transition: color var(--dur-quick) var(--ease-out), border-color var(--dur-quick) var(--ease-out); }
  .bands .chip[aria-pressed="true"] { color: var(--ink); border-color: var(--ink); }
  .row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .row input { flex: 1; min-width: 160px; accent-color: var(--ink); }
  .val { font-size: var(--text-sm); color: var(--graphite-strong); min-width: 9.5rem; }
  .val b { color: var(--ink); font-weight: 500; }
</style>
