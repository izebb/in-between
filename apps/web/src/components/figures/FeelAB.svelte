<script lang="ts">
  /**
   * FEEL: judge with your eyes before any number is shown.
   * "pick" — two or three versions side by side; choose, then the numbers are revealed.
   * "toggle" — one specimen with motion on or off; what did you lose?
   * Reduced motion: specimens wait for Play, and each option also shows its spacing, drawn still.
   */
  import { onMount } from "svelte";
  import Mock, { type MockKind, type MockMotion } from "./Mock.svelte";
  import SpacingTrack from "./SpacingTrack.svelte";
  import { parseSpec, describeSpec, toMove } from "~/lib/spec";
  import { prefs } from "~/lib/prefs.svelte";
  import { resolveMove } from "@inbetween/core";

  interface Option {
    label?: string;
    motion: MockMotion;
    /** Shown after the pick, e.g. "600ms, ease-out". Defaults to the numbers. */
    caption?: string;
  }
  interface Props {
    question: string;
    kind: MockKind;
    options: Option[];
    answer?: number;
    explain?: string;
    mode?: "pick" | "toggle";
    direction?: "enter" | "exit" | "loop";
    height?: number;
  }
  let { question, kind, options, answer, explain, mode = "pick", direction = "enter", height = 180 }: Props = $props();

  let mocks: Mock[] = $state([]);
  let root: HTMLElement;
  let picked = $state<number | null>(null);
  let motionOn = $state(true);
  let toggledOnce = $state(false);
  let playedOnce = false;

  const letters = ["A", "B", "C"];
  /** The timing that actually plays: exit values when the specimen exits. */
  const timingOf = (o: Option) =>
    direction === "exit"
      ? { easing: o.motion.exitEasing ?? "--ease-in", duration: o.motion.exitDuration ?? Math.round((o.motion.duration ?? 280) * 0.7) }
      : { easing: o.motion.easing ?? "--ease-out", duration: o.motion.duration ?? 280 };
  const numbers = (o: Option) => {
    if (o.caption) return o.caption;
    if (o.motion.none) return "no motion (0ms)";
    const t = timingOf(o);
    const spec = parseSpec(t.easing);
    const d = spec.type === "spring" ? Math.round(resolveMove(toMove({ easing: spec })).duration) : t.duration;
    return `${d}ms · ${t.easing}${o.motion.stagger ? ` · stagger ${o.motion.stagger}ms` : ""}`;
  };

  function playAll() {
    if (mode === "toggle") mocks[0]?.play();
    else mocks.forEach((m) => m?.play());
  }

  onMount(() => {
    prefs.start();
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting) && !playedOnce && !prefs.reduced) {
        playedOnce = true;
        setTimeout(playAll, 400);
      }
    }, { threshold: 0.5 });
    io.observe(root);
    return () => io.disconnect();
  });

  const stills = $derived(
    options.map((o) => ({
      move: toMove({ easing: o.motion.none ? "steps(1, jump-start)" : timingOf(o).easing, duration: o.motion.none ? 16 : timingOf(o).duration, to: 240 }),
      label: "",
    })),
  );
  const toggleMotion = $derived<MockMotion>(motionOn ? options[0].motion : { ...(options[1]?.motion ?? {}), none: true });
</script>

<div class="feel" bind:this={root}>
  <div class="q">
    <span class="smallcaps">Feel</span>
    <p class="question">{question}</p>
    <button class="btn small" type="button" onclick={playAll}>
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3v10l8-5z" fill="currentColor" /></svg>
      {mode === "toggle" ? "Play" : "Play all"}
    </button>
  </div>

  {#if mode === "pick"}
    <div class="grid" style={`--n:${options.length}`}>
      {#each options as o, i (i)}
        <div class="opt" class:chosen={picked === i}>
          <Mock bind:this={mocks[i]} {kind} motion={o.motion} {direction} {height} label={`Version ${letters[i]}`} />
          {#if prefs.reduced}
            <div class="still fig"><SpacingTrack rows={[stills[i]]} time={0} still chart={false} readout={false} ghosts="always" rowHeight={44} /></div>
          {/if}
          <div class="opt-foot">
            <button class="btn small ghost" type="button" onclick={() => mocks[i]?.play()} aria-label={`Replay ${letters[i]}`}>↻ {letters[i]}</button>
            <button class="btn small" type="button" aria-pressed={picked === i} onclick={() => (picked = i)}>{o.label ?? `Pick ${letters[i]}`}</button>
          </div>
          {#if picked !== null}
            <span class="numbers mono" data-motion="fade">{numbers(o)}</span>
          {/if}
        </div>
      {/each}
    </div>
    {#if picked !== null}
      <p class="explain" data-motion="rise">
        {#if answer !== undefined}<b>{picked === answer ? "Most eyes agree." : `Most eyes pick ${letters[answer]}.`}</b>{/if}
        {explain ?? ""}
      </p>
    {/if}
  {:else}
    <div class="toggle-stage">
      <Mock bind:this={mocks[0]} {kind} motion={toggleMotion} {direction} {height} label={motionOn ? "With motion" : "Without motion"} />
      <div class="toggle-row">
        <div class="seg" role="group" aria-label="Motion">
          <button type="button" aria-pressed={motionOn} onclick={() => { motionOn = true; toggledOnce = true; setTimeout(() => mocks[0]?.play(), 30); }}>{options[0].label ?? "With motion"}</button>
          <button type="button" aria-pressed={!motionOn} onclick={() => { motionOn = false; toggledOnce = true; setTimeout(() => mocks[0]?.play(), 30); }}>{options[1]?.label ?? "Without"}</button>
        </div>
        {#if toggledOnce}<span class="numbers mono" data-motion="fade">{motionOn ? numbers(options[0]) : "0ms: the state just changes"}</span>{/if}
      </div>
    </div>
    {#if toggledOnce && explain}<p class="explain" data-motion="rise">{explain}</p>{/if}
  {/if}
</div>

<style>
  .feel { display: flex; flex-direction: column; gap: 1rem; }
  .q { display: flex; align-items: baseline; gap: 0.75rem; flex-wrap: wrap; }
  .q .smallcaps { color: var(--graphite-strong); }
  .question { font-family: var(--font-display); font-size: 1.35rem; line-height: 1.2; flex: 1; min-width: 12rem; }
  .q .btn svg { width: 11px; height: 11px; }
  .grid { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 1rem; }
  @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
  .opt { display: flex; flex-direction: column; gap: 0.5rem; }
  .opt.chosen :global(.mock) { border-color: var(--ink); }
  .opt-foot { display: flex; justify-content: space-between; gap: 0.5rem; }
  .numbers { font-size: var(--text-xs); color: var(--graphite-strong); }
  .explain { font-size: var(--text-md); max-width: 62ch; }
  .explain b { font-weight: 600; margin-right: 0.3em; }
  .toggle-stage { display: flex; flex-direction: column; gap: 0.6rem; max-width: 460px; }
  .toggle-row { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
  .still { padding: 0 0.25rem; }
</style>
