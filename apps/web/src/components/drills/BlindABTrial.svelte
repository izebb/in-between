<script lang="ts">
  import { onMount } from "svelte";
  import Mock from "../figures/Mock.svelte";
  import type { BlindSpec, BlindAnswer } from "~/lib/drills/blind-ab";
  import type { Scored } from "~/lib/drills/types";
  import { prefs } from "~/lib/prefs.svelte";
  import ReplayIcon from "../ui/ReplayIcon.svelte";
  import PlayLabel from "./PlayLabel.svelte";

  let { spec, result, onanswer }: { spec: BlindSpec; result: Scored | null; onanswer: (v: BlindAnswer) => void } = $props();
  let mocks: Mock[] = $state([]);
  let pick = $state<0 | 1 | null>(null);
  const motionFor = (side: 0 | 1) => (side === spec.goodSide ? spec.pair.good : spec.pair.bad);
  const playBoth = () => mocks.forEach((m) => m?.play());
  onMount(() => {
    prefs.start();
    if (prefs.reduced) return;
    mocks.forEach((m) => m?.cue());
    setTimeout(playBoth, 350);
  });
</script>

<div class="trial">
  <div class="pair">
    {#each [0, 1] as i (i)}
      {@const side = i as 0 | 1}
      <div class="side" class:chosen={pick === side} class:right={result && side === spec.goodSide} class:wrong={result && pick === side && side !== spec.goodSide}>
        <Mock bind:this={mocks[i]} kind={spec.pair.kind} motion={motionFor(side)} direction={spec.pair.direction ?? "enter"} height={160} label={`Version ${side === 0 ? "A" : "B"}`} />
        <div class="foot">
          <button class="btn ghost small" type="button" onclick={() => mocks[i]?.play()} aria-label={`Replay ${side === 0 ? "A" : "B"}`}><ReplayIcon /> {side === 0 ? "A" : "B"}</button>
          <button class="btn small" type="button" aria-pressed={pick === side} disabled={!!result} onclick={() => (pick = side)}>{side === 0 ? "A" : "B"} is better</button>
        </div>
      </div>
    {/each}
  </div>
  {#if pick !== null && !result}
    <div class="why" data-motion="rise">
      <span class="label">Why, in one word?</span>
      <div class="words">
        {#each spec.words as w (w)}
          <button type="button" class="chip word" onclick={() => onanswer({ pick: pick!, word: w })}>{w}</button>
        {/each}
      </div>
    </div>
  {/if}
  <button class="btn ghost small" type="button" onclick={playBoth}><PlayLabel what="both" /></button>
</div>

<style>
  .trial { display: flex; flex-direction: column; gap: 0.8rem; align-items: flex-start; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; width: 100%; }
  @media (max-width: 520px) { .pair { grid-template-columns: 1fr; } }
  .side { display: flex; flex-direction: column; gap: 0.45rem; }
  /* Picked: an ink edge. Revealed: the better one keeps a heavier ink edge, a wrong pick goes dashed. */
  .side.chosen :global(.mock) { border-color: var(--ink); }
  .side.right :global(.mock) { border-color: var(--ink); box-shadow: inset 0 0 0 1px var(--ink); }
  .side.wrong :global(.mock) { border-style: dashed; border-color: var(--graphite); }
  .foot { display: flex; justify-content: space-between; }
  .why { display: flex; flex-direction: column; gap: 0.4rem; }
  .words { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  .word { cursor: pointer; font-size: var(--text-sm); padding: 0.3em 0.75em; transition: color var(--dur-quick) var(--ease-out), border-color var(--dur-quick) var(--ease-out); }
  .word:hover { color: var(--ink); border-color: var(--graphite); }
</style>
