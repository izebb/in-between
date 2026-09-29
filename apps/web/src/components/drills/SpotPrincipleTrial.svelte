<script lang="ts">
  import { onMount } from "svelte";
  import PrincipleClip from "../figures/PrincipleClip.svelte";
  import { PRINCIPLES } from "~/lib/principles";
  import type { SpotSpec } from "~/lib/drills/spot-principle";
  import type { Scored } from "~/lib/drills/types";
  import { prefs } from "~/lib/prefs.svelte";

  let { spec, result, onanswer }: { spec: SpotSpec; result: Scored | null; onanswer: (v: number) => void } = $props();
  let playing = $state(false);
  onMount(() => {
    prefs.start();
    playing = !prefs.reduced;
  });
  const name = (id: string) => PRINCIPLES.find((p) => p.id === id)!.name;
</script>

<div class="trial">
  <div class="stage">
    <PrincipleClip id={spec.id} {playing} height={170} />
    {#if prefs.reduced}<button class="btn small play" type="button" onclick={() => (playing = !playing)}>{playing ? "Stop" : "Play"}</button>{/if}
  </div>
  <div class="options" role="group" aria-label="Principles">
    {#each spec.options as o, i (o)}
      <button type="button" class="chip opt" class:right={result && o === spec.id} class:wrong={result && i === result.answer && o !== spec.id} disabled={!!result} onclick={() => onanswer(i)}>{name(o)}</button>
    {/each}
  </div>
</div>

<style>
  .trial { display: flex; flex-direction: column; gap: 0.9rem; }
  .stage { position: relative; max-width: 420px; }
  .play { position: absolute; right: 0.5rem; top: 0.5rem; background: var(--paper); }
  .options { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .opt { cursor: pointer; font-size: var(--text-sm); padding: 0.35em 0.8em; transition: color var(--dur-quick) var(--ease-out), border-color var(--dur-quick) var(--ease-out); }
  .opt:hover:not(:disabled) { color: var(--ink); border-color: var(--graphite); }
  .opt.right { color: var(--ink); border-color: var(--ink); }
  .opt.wrong { color: var(--blue-pencil); border-style: dashed; border-color: currentColor; }
</style>
