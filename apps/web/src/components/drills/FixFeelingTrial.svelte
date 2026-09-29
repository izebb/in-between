<script lang="ts">
  import { onMount } from "svelte";
  import Mock from "../figures/Mock.svelte";
  import { CASES, EASINGS, type FixSpec, type FixAnswer, type Knob } from "~/lib/drills/fix-feeling";
  import type { Scored } from "~/lib/drills/types";
  import type { MockMotion } from "../figures/Mock.svelte";
  import { prefs } from "~/lib/prefs.svelte";

  let { spec, result, onanswer }: { spec: FixSpec; result: Scored | null; onanswer: (v: FixAnswer) => void } = $props();
  const c = CASES[spec.index];
  const exit = c.direction === "exit";
  let mock: Mock;
  let knob = $state<Knob | null>(null);
  let duration = $state(exit ? (c.broken.exitDuration ?? 280) : (c.broken.duration ?? 280));
  let easing = $state(exit ? (c.broken.exitEasing ?? "--ease-in") : (c.broken.easing ?? "--ease-out"));
  let distance = $state(c.broken.distance ?? 16);
  let stagger = $state(c.broken.stagger ?? 0);

  const knobs: { id: Knob; label: string; show: boolean }[] = [
    { id: "duration", label: "Duration", show: c.broken.easing?.startsWith("spring") !== true || exit },
    { id: "easing", label: "Easing", show: true },
    { id: "distance", label: "Distance", show: ["card", "toast", "list"].includes(c.kind) },
    { id: "stagger", label: "Stagger", show: c.kind === "list" },
  ];

  /** The broken motion with exactly one parameter changed. */
  const motion = $derived.by<MockMotion>(() => {
    const m: MockMotion = { ...c.broken };
    if (knob === "duration") exit ? (m.exitDuration = duration) : (m.duration = duration);
    if (knob === "easing") exit ? (m.exitEasing = easing) : (m.easing = easing);
    if (knob === "distance") m.distance = distance;
    if (knob === "stagger") m.stagger = stagger;
    return m;
  });
  let timer: ReturnType<typeof setTimeout> | null = null;
  function replaySoon() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => mock?.play(), 160);
  }
  onMount(() => {
    prefs.start();
    if (!prefs.reduced) setTimeout(() => mock?.play(), 350);
  });
</script>

<div class="trial">
  <div class="top">
    <span class="smallcaps">Feels</span>
    <span class="word serif">“{c.word}”</span>
  </div>
  <div class="stage">
    <Mock bind:this={mock} kind={c.kind} {motion} direction={c.direction ?? "enter"} height={170} label="The broken animation" />
    <button class="btn small replay" type="button" onclick={() => mock.play()}>{prefs.reduced ? "Play" : "Replay"}</button>
  </div>
  {#if !result}
    <div class="change">
      <span class="label">What will you change? One thing.</span>
      <div class="seg" role="group" aria-label="Parameter">
        {#each knobs.filter((k) => k.show) as k (k.id)}
          <button type="button" aria-pressed={knob === k.id} onclick={() => { knob = k.id; replaySoon(); }}>{k.label}</button>
        {/each}
      </div>
      {#if knob === "duration"}
        <label class="ctl"><input type="range" min="40" max="1400" step="10" bind:value={duration} oninput={replaySoon} /> <span class="mono">{duration}ms</span></label>
      {:else if knob === "easing"}
        <div class="seg easings" role="group" aria-label="Easing">
          {#each EASINGS as e (e.id)}<button type="button" aria-pressed={easing === e.id} onclick={() => { easing = e.id; replaySoon(); }}>{e.label}</button>{/each}
        </div>
      {:else if knob === "distance"}
        <label class="ctl"><input type="range" min="0" max="200" step="2" bind:value={distance} oninput={replaySoon} /> <span class="mono">{distance}px</span></label>
      {:else if knob === "stagger"}
        <label class="ctl"><input type="range" min="0" max="200" step="5" bind:value={stagger} oninput={replaySoon} /> <span class="mono">{stagger}ms</span></label>
      {/if}
      <button class="btn solid submit" type="button" disabled={!knob} onclick={() => knob && onanswer({ knob, motion })}>That fixes it</button>
    </div>
  {/if}
</div>

<style>
  .trial { display: flex; flex-direction: column; gap: 0.8rem; }
  .top { display: flex; align-items: baseline; gap: 0.6rem; }
  .top .smallcaps { color: var(--graphite-strong); }
  .word { font-size: 1.8rem; line-height: 1; }
  .stage { position: relative; max-width: 440px; }
  .replay { position: absolute; right: 0.5rem; top: 0.5rem; background: var(--paper); }
  .change { display: flex; flex-direction: column; gap: 0.55rem; align-items: flex-start; }
  .ctl { display: flex; align-items: center; gap: 0.6rem; width: 100%; max-width: 440px; }
  .ctl input { flex: 1; accent-color: var(--ink); }
  .ctl .mono { font-size: var(--text-sm); min-width: 4rem; }
  .easings { max-width: 440px; }
  .submit { margin-top: 0.3rem; }
</style>
