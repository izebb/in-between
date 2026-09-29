<script lang="ts">
  /**
   * The app as a place. Forward slides the new screen in from the right, over the one you leave,
   * which gives way 30% and dims (x is sequence). A sheet rises and the page behind recedes
   * (z is hierarchy). Back retraces the push: the top screen slides off the way it came and the
   * one under it returns from where it was left. Switch the model off and directions go random.
   * Every screen stays mounted and each move starts from where the screen is now, so a tap
   * mid-flight turns it around instead of jumping. The map on the right shows where you are.
   */
  import { onMount } from "svelte";
  import { cubicBezier } from "@inbetween/core";
  import { prefs, watchPlateStill } from "~/lib/prefs.svelte";
  import { duration as dur, exitDuration, exitRatio, easing, easingCss } from "~/motion/tokens";

  let { duration = 360, coherent: startCoherent = true, hint = "Tap through the app. Then turn the model off and do it again." }: { duration?: number; coherent?: boolean; hint?: string } = $props();

  type Page = "home" | "inbox" | "message";
  const TITLES: Record<Page, string> = { home: "Home", inbox: "Inbox", message: "Message" };
  const all: Page[] = ["home", "inbox", "message"];
  let stack = $state<Page[]>(["home"]);
  let sheet = $state(false);
  let coherent = $state(startCoherent);
  let still = $state(false);
  let root: HTMLElement;
  const els: Partial<Record<Page, HTMLElement>> = {};
  function register(node: HTMLElement, page: Page) {
    els[page] = node;
    return { destroy: () => delete els[page] };
  }
  let shown = $state<Record<Page, boolean>>({ home: true, inbox: false, message: false });
  onMount(() => watchPlateStill(root, (v) => (still = v)));

  /** A screen's pose: offset in % of the phone (x, y) and opacity. */
  interface Pose { x: number; y: number; o: number }
  const TOP: Pose = { x: 0, y: 0, o: 1 };
  const AHEAD: Pose = { x: 100, y: 0, o: 1 }; // the next screen waits off the right edge
  const UNDER: Pose = { x: -30, y: 0, o: 0.5 }; // the one you left: a little left, and dimmed
  const calm = () => prefs.reduced || still;
  const enter = () => ({ duration, easing: easingCss.out });
  const exit = () => ({ duration: Math.round(duration * exitRatio), easing: easingCss.in });

  const frame = (el: HTMLElement, p: Pose) => ({ transform: `translate(${(p.x / 100) * el.offsetWidth}px, ${(p.y / 100) * el.offsetHeight}px)`, opacity: String(p.o) });
  /** Move a screen to a pose. It starts from where it is on screen now (so interruptions never jump),
   *  unless it's at rest and `from` places it first: off screen, or hidden under the top screen. */
  function place(page: Page, to: Pose, timing: { duration: number; easing: string }, from?: Pose) {
    const el = els[page];
    if (!el) return;
    const moving = el.getAnimations().some((a) => a.playState === "running");
    const cs = getComputedStyle(el);
    const start = from && !moving ? frame(el, from) : { transform: cs.transform, opacity: cs.opacity };
    el.getAnimations().forEach((a) => a.cancel());
    shown[page] = true;
    el.animate([start, frame(el, to)], { ...timing, fill: "forwards" }).finished.then(
      () => (shown[page] = page === top), // a screen at rest off screen or under the top one is hidden
      () => {}, // cancelled: a newer move took over
    );
  }
  /** Scrambled: a random axis and side for every move. */
  const anywhere = (dist: number, o = 1): Pose => {
    const d = (Math.random() < 0.5 ? -1 : 1) * dist;
    return Math.random() < 0.5 ? { x: d, y: 0, o } : { x: 0, y: d, o };
  };

  function forward(p: Page) {
    const from = stack[stack.length - 1];
    stack = [...stack, p];
    if (calm()) {
      // Reduce, don't remove: the new screen dissolves in over the old one.
      place(p, TOP, { duration: dur.quick, easing: easingCss.out }, { x: 0, y: 0, o: 0 });
    } else {
      place(p, TOP, enter(), coherent ? AHEAD : anywhere(100));
      place(from, coherent ? UNDER : anywhere(30, 0.5), exit());
    }
  }
  function back() {
    if (sheet) return (sheet = false);
    if (stack.length < 2) return;
    const from = stack[stack.length - 1];
    stack = stack.slice(0, -1);
    const to = stack[stack.length - 1];
    if (calm()) {
      place(from, { x: 0, y: 0, o: 0 }, { duration: exitDuration.quick, easing: easingCss.in });
      place(to, TOP, { duration: 0, easing: "linear" });
    } else if (coherent) {
      // The same path, the other way: the top screen leaves the way it came, the one under it comes back.
      place(from, AHEAD, exit());
      place(to, TOP, enter());
    } else {
      place(from, anywhere(100), exit());
      place(to, TOP, enter(), anywhere(30, 0.5));
    }
  }
  /** The sheet rises on the enter's timing and sinks on the exit's; closed mid-rise, it turns around. */
  function rise(_node: Element, _p: unknown, { direction }: { direction: "in" | "out" | "both" }) {
    const out = direction === "out";
    if (calm()) return { duration: out ? exitDuration.quick : dur.quick, css: (t: number) => `opacity: ${t}` };
    return {
      duration: out ? Math.round(duration * exitRatio) : duration,
      easing: out ? inE : outE,
      css: (t: number) => `transform: translateY(${(1 - t) * 100}%)`,
    };
  }
  const outE = cubicBezier(...easing.out);
  const inE = cubicBezier(...easing.in);
  const top = $derived(stack[stack.length - 1]);
  const isCalm = $derived(prefs.reduced || still);
  const rest = (p: Page) => (p === "home" ? "" : "transform: translateX(100%)");
</script>

<div class="spatial" class:calm={isCalm} bind:this={root}>
  <div class="phone" class:behind={sheet}>
    <div class="viewport">
      {#each all as p (p)}
        <div class="screen" class:hidden={!shown[p]} use:register={p} style={rest(p)} inert={p !== top}>
          <header class="nav">
            {#if p !== "home"}<button type="button" class="back" onclick={back} aria-label="Back">‹</button>{/if}
            <span class="serif">{TITLES[p]}</span>
          </header>
          {#if p === "home"}
            <button type="button" class="cell" onclick={() => forward("inbox")}>Inbox <span>›</span></button>
            <div class="cell muted">Settings</div>
            <div class="cell muted">Archive</div>
          {:else if p === "inbox"}
            {#each ["A note from Ada", "Weekly digest", "Re: spacing"] as m (m)}
              <button type="button" class="cell" onclick={() => forward("message")}>{m} <span>›</span></button>
            {/each}
          {:else}
            <div class="msg"><div class="l w70"></div><div class="l w90"></div><div class="l w80"></div><div class="l w50"></div></div>
            <button type="button" class="btn small reply" onclick={() => (sheet = true)}>Reply</button>
          {/if}
        </div>
      {/each}
    </div>
    {#if sheet}
      <div class="sheet" transition:rise>
        <div class="grab"></div>
        <span class="serif">Reply</span>
        <div class="l w90"></div><div class="l w60"></div>
        <button type="button" class="btn small" onclick={() => (sheet = false)}>Close</button>
      </div>
    {/if}
  </div>

  <div class="map" aria-label="Where you are">
    <span class="smallcaps">The place</span>
    <svg viewBox="0 0 240 162" width="240" height="162" role="img" aria-label={`You are on ${TITLES[top]}${sheet ? ", with a sheet open" : ""}`}>
      <line class="ax" x1="20" y1="110" x2="220" y2="110" />
      <text class="label" x="220" y="156" text-anchor="end">sequence (x) →</text>
      <line class="ax" x1="20" y1="110" x2="20" y2="18" />
      <text class="label" x="26" y="16">depth (z) ↑</text>
      {#each all as p, i (p)}
        {@const x = 50 + i * 70}
        <rect x={x - 22} y="88" width="44" height="30" rx="4" class={p === top && !sheet ? "here" : stack.includes(p) ? "been" : "node"} />
        <text class="label" {x} y="138" text-anchor="middle">{TITLES[p]}</text>
      {/each}
      <rect x="168" y="36" width="44" height="30" rx="4" class={sheet ? "here" : "node"} />
      <text class="label" x="190" y="30" text-anchor="middle">sheet</text>
    </svg>
    <label class="check"><input type="checkbox" bind:checked={coherent} /> Consistent spatial model</label>
    <p class="hint">{hint}</p>
  </div>
</div>

<style>
  .spatial { display: flex; gap: 2rem; flex-wrap: wrap; align-items: flex-start; }
  .phone { position: relative; width: 250px; height: 380px; border: 1px solid var(--graphite); border-radius: 22px; background: var(--paper); overflow: hidden; flex: none; }
  .viewport { position: absolute; inset: 0; transition: transform var(--dur-base) var(--ease-out), filter var(--dur-base) var(--ease-out); }
  .phone.behind .viewport { transform: scale(0.93); filter: brightness(0.85); }
  .calm .phone.behind .viewport { transform: none; } /* reduced motion: the page dims but doesn't move */
  .screen { position: absolute; inset: 0; padding: 14px; background: var(--paper); display: flex; flex-direction: column; gap: 6px; }
  .screen.hidden { visibility: hidden; }
  .nav { display: flex; align-items: center; gap: 8px; height: 36px; margin-bottom: 6px; }
  .nav .serif { font-size: 1.35rem; }
  .back { font-size: 1.6rem; line-height: 1; color: var(--ink); padding: 0 4px; }
  .cell { display: flex; justify-content: space-between; align-items: center; padding: 10px 8px; border-bottom: 1px solid var(--rule); font-size: var(--text-sm); color: var(--ink); text-align: left; }
  button.cell:hover { background: var(--paper-raised); }
  .cell.muted { color: var(--graphite-strong); }
  .msg { padding: 6px 0; }
  .l { height: 7px; border-radius: 4px; background: color-mix(in srgb, var(--ink) 14%, transparent); margin: 9px 0; }
  .w50 { width: 50%; } .w60 { width: 60%; } .w70 { width: 70%; } .w80 { width: 80%; } .w90 { width: 90%; }
  .reply { align-self: flex-start; margin-top: auto; }
  .sheet { position: absolute; left: 0; right: 0; bottom: 0; height: 58%; padding: 12px 16px; background: var(--paper-raised); border-top: 1px solid var(--rule); border-radius: 16px 16px 0 0; box-shadow: 0 -10px 30px -18px rgb(0 0 0 / 0.5); display: flex; flex-direction: column; gap: 6px; }
  .sheet .serif { font-size: 1.2rem; }
  .sheet .btn { align-self: flex-end; margin-top: auto; }
  .grab { width: 36px; height: 4px; border-radius: 2px; background: var(--rule); align-self: center; margin-bottom: 4px; }
  .map { display: flex; flex-direction: column; gap: 0.6rem; }
  .map .smallcaps { color: var(--graphite-strong); }
  .map :global(.node) { fill: var(--paper); stroke: var(--graphite); }
  .map :global(.been) { fill: color-mix(in srgb, var(--blue-pencil) 14%, var(--paper)); stroke: var(--blue-pencil); }
  .map :global(.here) { fill: var(--red-pencil); stroke: var(--red-pencil); }
  .check { display: flex; align-items: center; gap: 0.4rem; font-size: var(--text-sm); color: var(--graphite-strong); }
  .check input { accent-color: var(--ink); }
  .hint { font-size: var(--text-sm); color: var(--graphite-strong); max-width: 30ch; }
</style>
