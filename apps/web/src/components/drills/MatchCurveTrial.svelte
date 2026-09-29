<script lang="ts">
  import { onMount } from "svelte";
  import Mock from "../figures/Mock.svelte";
  import SpacingTrack from "../figures/SpacingTrack.svelte";
  import CurveThumb from "./CurveThumb.svelte";
  import type { MatchCurveSpec } from "~/lib/drills/match-curve";
  import type { Scored } from "~/lib/drills/types";
  import { toMove } from "~/lib/spec";
  import { prefs } from "~/lib/prefs.svelte";
  import PlayLabel from "./PlayLabel.svelte";

  let { spec, result, onanswer }: { spec: MatchCurveSpec; result: Scored | null; onanswer: (v: number) => void } = $props();
  let mock: Mock;
  onMount(() => {
    prefs.start();
    if (prefs.reduced) return;
    mock?.cue();
    setTimeout(() => mock?.play(), 350);
  });
  const truth = $derived(spec.options[spec.correct]);
  const rows = $derived(
    result
      ? [
          { move: toMove({ easing: truth.easing, duration: spec.duration, to: 300 }), label: truth.label },
          ...(result.answer !== spec.correct
            ? [{ move: toMove({ easing: spec.options[result.answer].easing, duration: spec.duration, to: 300 }), label: spec.options[result.answer].label, tone: "blue" as const }]
            : []),
        ]
      : [],
  );
</script>

<div class="trial">
  <div class="stage">
    <Mock bind:this={mock} kind="dot" motion={{ easing: truth.easing, duration: spec.duration }} height={110} label="A motion to identify" />
    <button class="btn small replay" type="button" onclick={() => mock.play()}><PlayLabel /></button>
  </div>
  <div class="options" role="group" aria-label="Curves">
    {#each spec.options as o, i (o.id)}
      <button
        type="button"
        class="option"
        class:right={result && i === spec.correct}
        class:wrong={result && i === result.answer && i !== spec.correct}
        disabled={!!result}
        onclick={() => onanswer(i)}
      >
        <CurveThumb easing={o.easing} />
        <span class="mono">{result ? o.label : String.fromCharCode(65 + i)}</span>
      </button>
    {/each}
  </div>
  {#if result}
    <div class="reveal fig" data-motion="fade">
      <SpacingTrack {rows} time={0} still chart={false} readout={false} ghosts="always" />
    </div>
  {/if}
</div>

<style>
  .trial { display: flex; flex-direction: column; gap: 1rem; }
  .stage { position: relative; }
  .replay { position: absolute; right: 0.5rem; top: 0.5rem; background: var(--paper); }
  .options { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.5rem; }
  @media (max-width: 520px) { .options { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  .option { display: flex; flex-direction: column; align-items: center; gap: 0.3rem; padding: 0.6rem 0.4rem 0.5rem; border: 1px solid var(--rule); border-radius: 6px; color: var(--ink); background: var(--paper); transition: border-color var(--dur-quick) var(--ease-out), box-shadow var(--dur-quick) var(--ease-out), color var(--dur-quick) var(--ease-out); }
  .option:hover:not(:disabled) { border-color: var(--graphite); }
  .option .mono { font-size: var(--text-xs); color: var(--graphite-strong); }
  .option.right { border-color: var(--ink); box-shadow: inset 0 0 0 1px var(--ink); }
  .option.wrong { border-style: dashed; border-color: currentColor; color: var(--blue-pencil); }
  .option:disabled { cursor: default; }
</style>
