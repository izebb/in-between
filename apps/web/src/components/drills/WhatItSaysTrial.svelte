<script lang="ts">
  import { onMount } from "svelte";
  import Mock from "../figures/Mock.svelte";
  import type { WhatItSaysSpec } from "~/lib/drills/what-it-says";
  import type { Scored } from "~/lib/drills/types";
  import { prefs } from "~/lib/prefs.svelte";
  import PlayLabel from "./PlayLabel.svelte";

  let { spec, result, onanswer }: { spec: WhatItSaysSpec; result: Scored | null; onanswer: (v: number) => void } = $props();
  let mock: Mock;
  onMount(() => {
    prefs.start();
    if (prefs.reduced) return;
    // It is about to play: hold its first frame, so the clip starts clean instead of from its end state.
    mock?.cue();
    setTimeout(() => mock?.play(), 350);
  });
</script>

<div class="trial">
  <div class="stage">
    <Mock bind:this={mock} kind={spec.clip.kind} motion={spec.clip.motion} direction={spec.clip.direction ?? "enter"} height={180} label="A UI clip" />
    <button class="btn small replay" type="button" onclick={() => mock.play()}><PlayLabel /></button>
  </div>
  <div class="options" role="group" aria-label="Meanings">
    {#each spec.options as o, i (o)}
      <button type="button" class="chip opt" class:right={result && o === spec.clip.says} class:wrong={result && i === result.answer && o !== spec.clip.says} disabled={!!result} onclick={() => onanswer(i)}>{o}</button>
    {/each}
  </div>
</div>

<style>
  .trial { display: flex; flex-direction: column; gap: 0.9rem; }
  .stage { position: relative; max-width: 420px; }
  .replay { position: absolute; right: 0.5rem; top: 0.5rem; background: var(--paper); }
  .options { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .opt { cursor: pointer; font-size: var(--text-sm); padding: 0.35em 0.8em; transition: color var(--dur-quick) var(--ease-out), border-color var(--dur-quick) var(--ease-out); }
  .opt:hover:not(:disabled) { color: var(--ink); border-color: var(--graphite); }
  .opt.right { color: var(--ink); border-color: var(--ink); }
  .opt.wrong { color: var(--blue-pencil); border-style: dashed; border-color: currentColor; }
  .opt:disabled { cursor: default; }
</style>
