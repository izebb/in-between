<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import DataChart from "../figures/DataChart.svelte";
  import { PlayheadTransport } from "~/lib/transport.svelte";
  import { STATES, layout, transition, type Frame } from "~/lib/datastage";
  import type { LiesSpec } from "~/lib/drills/transition-lies";
  import type { Scored } from "~/lib/drills/types";
  import { parseSpec } from "~/lib/spec";
  import { prefs } from "~/lib/prefs.svelte";
  import { resize } from "~/lib/actions";

  let { spec, result, onanswer }: { spec: LiesSpec; result: Scored | null; onanswer: (v: number) => void } = $props();
  let w = $state(320);
  const frame = $derived<Frame>({ width: Math.max(220, w), height: 200, padL: 26, padB: 18, padT: 12 });
  const st = (id: string) => STATES.find((s) => s.id === id)!;
  const honest = { duration: 800, stagger: 25, easing: parseSpec("--ease-inout"), keying: "data" as const, staging: "together" as const };

  const sides = $derived(
    [0, 1].map((i) => {
      const lies = i === spec.liar;
      const from = layout(st(spec.from), frame);
      const baseline = lies && spec.lie === "baseline";
      const to = layout(st(spec.to), frame, undefined, baseline ? 36 : 0);
      const opts = {
        ...honest,
        easing: lies && spec.lie === "overshoot" ? parseSpec("spring(response .55 bounce .6)") : honest.easing,
        keying: lies && spec.lie === "index" ? ("index" as const) : ("data" as const),
      };
      return { tr: transition(from, to, frame, opts), axisMin: baseline ? 36 : 0, max: to.max };
    }),
  );
  const transport = new PlayheadTransport({ duration: 1000, hold: 600, loop: false });
  $effect(() => transport.setDuration(Math.max(...sides.map((s) => s.tr.total))));
  function play() {
    transport.restart();
    transport.play();
  }
  onMount(() => {
    prefs.start();
    if (!prefs.reduced) setTimeout(play, 400);
  });
  onDestroy(() => transport.destroy());
  // The truncated axis only swaps in at the end state: show it as the new axis once past halfway.
  const axisFor = (i: number) => (transport.time > transport.duration / 2 ? sides[i].axisMin : 0);
</script>

<div class="trial fig">
  <div class="pair">
    {#each [0, 1] as i (i)}
      <div class="side" class:right={result && i === spec.liar} class:wrong={result && i === result.answer && i !== spec.liar}>
        <div class="chart" use:resize={(width) => (w = width)}>
          <DataChart marks={sides[i].tr.at(transport.time)} {frame} max={sides[i].max} tracked="h" settled={transport.time >= transport.duration - 1} axisMin={axisFor(i)} labels={false} />
        </div>
        <button class="btn small" type="button" disabled={!!result} onclick={() => onanswer(i)}>{i === 0 ? "A" : "B"} lies</button>
      </div>
    {/each}
  </div>
  <button class="btn ghost small" type="button" onclick={play}>{prefs.reduced ? "Play both" : "Replay both"}</button>
</div>

<style>
  .trial { display: flex; flex-direction: column; gap: 0.6rem; align-items: flex-start; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; width: 100%; }
  @media (max-width: 560px) { .pair { grid-template-columns: 1fr; } }
  .side { display: flex; flex-direction: column; gap: 0.5rem; }
  .chart { border: 1px solid var(--rule); border-radius: 8px; padding: 0.6rem; background: var(--paper); }
  .side.right .chart { border-color: var(--ink); }
  .side.wrong .chart { border-style: dashed; }
</style>
