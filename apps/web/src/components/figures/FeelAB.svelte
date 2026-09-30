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
  import ReplayIcon from "../ui/ReplayIcon.svelte";

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
    // They will play by themselves once in view: until then each waits on its first frame, so the
    // first thing you see move is the version itself, not a jump back to its start.
    if (!prefs.reduced) (mode === "toggle" ? mocks.slice(0, 1) : mocks).forEach((m) => m?.cue());
    // In view means half of it, or half the screen for one taller than that. (The island hydrates as its
    // first pixel scrolls in: that's not yet a view.)
    const inView = (e: IntersectionObserverEntry) =>
      e.intersectionRatio >= 0.5 || (!!e.rootBounds && e.intersectionRect.height >= e.rootBounds.height * 0.5);
    const io = new IntersectionObserver((entries) => {
      if (entries.some(inView) && !playedOnce && !prefs.reduced) {
        playedOnce = true;
        setTimeout(playAll, 400);
      }
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    io.observe(root);
    return () => io.disconnect();
  });

  // Still versions say what kind of change each option is: a cut, a fade in place, or a move.
  // A fade is drawn as opacity over time, so it can't be mistaken for travel.
  const stills = $derived(
    options.map((o) => {
      const t = timingOf(o);
      if (o.motion.none) return { move: toMove({ easing: "steps(1, jump-start)", duration: 16, to: 240 }), label: "cut" };
      if (o.motion.distance === 0) return { move: toMove({ easing: t.easing, duration: t.duration, property: "opacity", from: 0, to: 1 }), label: "fades in place" };
      return { move: toMove({ easing: t.easing, duration: t.duration, to: 240 }), label: "moves" };
    }),
  );
  /** Toggle compares the first option with the second: a cut unless the second option says otherwise. */
  const toggleMotion = $derived<MockMotion>(motionOn ? options[0].motion : (options[1]?.motion ?? { none: true }));
</script>

<!-- A caption breaks between its " · " parts, never inside a token like --ease-out, and never before a dot. -->
{#snippet nums(text: string)}
  {#each text.split(" · ") as part, k (k)}{#if k}{"\u00a0· "}{/if}<span class:nb={part.length <= 32}>{part}</span>{/each}
{/snippet}

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
            <button class="btn small ghost" type="button" onclick={() => mocks[i]?.play()} aria-label={`Replay ${letters[i]}`}><ReplayIcon /> {letters[i]}</button>
            <button class="btn small" type="button" aria-pressed={picked === i} onclick={() => (picked = i)}>{o.label ?? `Pick ${letters[i]}`}</button>
          </div>
          {#if picked !== null}
            <span class="numbers mono" data-motion="fade">{@render nums(numbers(o))}</span>
          {/if}
        </div>
      {/each}
    </div>
    {#if picked !== null}
      <p class="explain" data-motion="rise">
        {#if answer !== undefined}{#key picked === answer}<b data-motion="fade">{picked === answer ? "That is the better one." : `The better one is ${letters[answer]}.`}</b>{/key}{/if}
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
        {#if toggledOnce}{#key motionOn}<span class="numbers mono" data-motion="fade">{@render nums(motionOn ? numbers(options[0]) : options[1]?.motion && !options[1].motion.none ? numbers(options[1]) : "0ms: the state just changes")}</span>{/key}{/if}
      </div>
    </div>
    {#if toggledOnce && explain}<p class="explain" data-motion="rise">{explain}</p>{/if}
  {/if}
</div>

<style>
  .feel { display: flex; flex-direction: column; gap: 1rem; }
  /* The head reads as a figure's does: the beat's name and Play on one line, the question under them,
     flush with the screens' left edge at a reading size, so a long question wraps back to that edge. */
  .q { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 0.3rem 1rem; }
  .q .smallcaps { grid-area: 1 / 1; color: var(--graphite-strong); }
  .q .btn { grid-area: 1 / 2; }
  .question { grid-area: 2 / 1 / 3 / -1; font-family: var(--font-body); font-size: var(--text-md); line-height: 1.5; color: var(--ink); max-width: 64ch; text-wrap: pretty; }
  .q .btn svg { width: 11px; height: 11px; }
  .grid { display: grid; grid-template-columns: repeat(var(--n), minmax(0, 1fr)); gap: 1rem; }
  @media (max-width: 640px) { .grid { grid-template-columns: 1fr; } }
  .opt { display: flex; flex-direction: column; gap: 0.5rem; }
  .opt.chosen :global(.mock) { border-color: var(--ink); }
  .opt-foot { display: flex; justify-content: space-between; gap: 0.5rem; }
  /* The ghost button's padding is only there for its hover tint: its mark sits on the screen's edge */
  .opt-foot .btn.ghost { margin-left: -0.5rem; }
  .numbers { font-size: var(--text-xs); color: var(--graphite-strong); }
  .nb { white-space: nowrap; }
  .explain { font-size: var(--text-md); max-width: 62ch; }
  .explain b { font-weight: 600; margin-right: 0.3em; }
  .toggle-stage { display: flex; flex-direction: column; gap: 0.6rem; max-width: 460px; }
  .toggle-row { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; }
  .still { padding: 0 0.25rem; }
</style>
