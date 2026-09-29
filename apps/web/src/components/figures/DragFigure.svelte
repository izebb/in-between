<script lang="ts">
  /**
   * Direct manipulation: the card is under your finger 1:1, rubber-bands past the edges,
   * and when you let go it keeps your velocity: the landing is projected, the nearest detent is
   * chosen, and a spring carries it there starting at the speed you threw it.
   * Grab it mid-flight and it stops under your finger: interruptible.
   */
  import { onMount, onDestroy } from "svelte";
  import { createLoop, rubberband, velocityTracker, spring, fromResponse, lambdaFromRate, DecelerationRate, type Loop } from "@inbetween/core";
  import { prefs, watchPlateStill } from "~/lib/prefs.svelte";
  import { resize } from "~/lib/actions";

  let { response = 0.35, bounce = 0.1 }: { response?: number; bounce?: number } = $props();

  let w = $state(560);
  const CARD = 96;
  const max = $derived(Math.max(0, w - CARD));
  const detents = $derived([0, max / 2, max]);
  let x = $state(0);
  let dragging = $state(false);
  let rubber = $state(true);
  let carry = $state(true);
  let projectOn = $state(true);
  let last = $state<{ v: number; landing: number; target: number } | null>(null);
  let loop: Loop | null = null;
  const tracker = velocityTracker(100);
  let grabOffset = 0;
  let track: HTMLDivElement;
  let root: HTMLElement;
  let still = $state(false);
  const RUBBER = 0.55; // the rubberband() default: iOS-like

  function toTrack(clientX: number) {
    return clientX - track.getBoundingClientRect().left;
  }
  function limit(raw: number) {
    if (raw >= 0 && raw <= max) return raw;
    if (!rubber) return Math.min(max, Math.max(0, raw));
    return raw < 0 ? rubberband(raw, w, RUBBER) : max + rubberband(raw - max, w, RUBBER);
  }
  /** The inverse: where the finger would be for the card to sit at `pos`. Catching the card past an
   *  edge must start from here, or the band is applied twice and the card jumps toward the edge. */
  function unlimit(pos: number) {
    if (pos >= 0 && pos <= max) return pos;
    const past = pos < 0 ? -pos : pos - max;
    const p = Math.min(past, w * 0.99);
    const raw = (p * w) / (RUBBER * (w - p));
    return pos < 0 ? -raw : max + raw;
  }

  function down(e: PointerEvent) {
    loop?.stop(); // interruptible: catch it where it is
    loop = null;
    dragging = true;
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    grabOffset = toTrack(e.clientX) - (rubber ? unlimit(x) : x); // keep the spot you took hold of
    tracker.reset();
    tracker.add(x, e.timeStamp);
  }
  function move(e: PointerEvent) {
    if (!dragging) return;
    x = limit(toTrack(e.clientX) - grabOffset);
    tracker.add(x, e.timeStamp); // the card's own path, so the spring starts at the card's speed
  }
  function up(e: PointerEvent) {
    if (!dragging) return;
    dragging = false;
    // Where it lifted, and when: a finger that stopped before lifting has no speed left to give.
    // (A cancelled pointer may report no position, so it keeps the last one.)
    if (e.type === "pointerup") x = limit(toTrack(e.clientX) - grabOffset);
    tracker.add(x, e.timeStamp);
    const v = tracker.velocity(); // px/s, from the last ~100ms only
    const lambda = lambdaFromRate(DecelerationRate.normal);
    const landing = projectOn ? x + v / lambda : x;
    const target = detents.reduce((a, b) => (Math.abs(b - landing) < Math.abs(a - landing) ? b : a));
    last = { v, landing, target };
    settle(target, carry ? v : 0);
  }
  /** A spring to the target, starting at velocity v. Reduced motion (or Still): the drag was the
   *  reader's own, so it still tracks 1:1; only the settle is skipped. */
  function settle(target: number, v: number) {
    loop?.stop();
    loop = null;
    if (prefs.reduced || still) {
      x = target;
      return;
    }
    const sp = spring(fromResponse(response, bounce), { from: x, to: target, velocity: v });
    const end = sp.settleTime();
    loop = createLoop(({ time }) => {
      x = sp.position(Math.min(time, end));
      if (time >= end) {
        x = target;
        loop = null;
        return false;
      }
    });
  }
  function key(e: KeyboardEvent) {
    // The next stop along, from wherever the card is now (it may be mid-settle).
    const next = e.key === "ArrowRight" ? detents.find((d) => d > x + 1) : e.key === "ArrowLeft" ? [...detents].reverse().find((d) => d < x - 1) : undefined;
    if (next === undefined) return;
    e.preventDefault();
    settle(next, 0);
  }
  onMount(() => watchPlateStill(root, (v) => (still = v)));
  onDestroy(() => loop?.stop());
</script>

<div class="drag" bind:this={root}>
  <div class="track" bind:this={track} use:resize={(width) => (w = width)}>
    <!-- Placed by fraction of the track, so the server render fits any width before hydration. -->
    {#each [0, 0.5, 1] as f (f)}<span class="detent" style={`left:calc(${f * 100}% + ${CARD / 2 - f * CARD}px)`}></span>{/each}
    {#if last}
      <span class="landing" style={`left:${Math.max(-40, Math.min(w + 40, last.landing + CARD / 2))}px`} title="Projected landing"></span>
    {/if}
    <div
      class="card"
      class:dragging
      style={`transform: translateX(${x}px)`}
      role="slider"
      tabindex="0"
      aria-label="Draggable card"
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(x)}
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      onpointercancel={up}
      onkeydown={key}
    >
      <span class="grip"></span>
    </div>
  </div>
  <div class="readout mono">
    {#if last}
      <span>release <b>{Math.round(last.v)}</b> px/s</span>
      <span>projected <b>{Math.round(last.landing)}</b> px</span>
      <span>snaps to <b>{last.target === 0 ? "left" : last.target === max ? "right" : "middle"}</b></span>
    {:else}
      <span>Drag the card, fling it, pull it past the edges, catch it mid-flight.</span>
    {/if}
  </div>
  <div class="toggles">
    <label><input type="checkbox" bind:checked={rubber} /> Rubber-band</label>
    <label><input type="checkbox" bind:checked={projectOn} /> Project the landing</label>
    <label><input type="checkbox" bind:checked={carry} /> Keep the velocity</label>
  </div>
</div>

<style>
  .drag { display: flex; flex-direction: column; gap: 0.75rem; user-select: none; }
  .track { position: relative; height: 96px; border-bottom: 1px solid var(--rule); touch-action: none; }
  .detent { position: absolute; bottom: -5px; width: 1px; height: 9px; background: var(--graphite); }
  .landing { position: absolute; bottom: 4px; width: 14px; height: 14px; margin-left: -7px; border-radius: 50%; border: 1.5px solid var(--blue-pencil); }
  .card { position: absolute; left: 0; top: 10px; width: 96px; height: 64px; border-radius: 10px; background: var(--red-pencil); cursor: grab; display: grid; place-items: center; touch-action: none; }
  .card.dragging { cursor: grabbing; }
  .grip { width: 28px; height: 4px; border-radius: 2px; background: color-mix(in srgb, var(--paper) 70%, transparent); }
  .readout { display: flex; flex-wrap: wrap; gap: 0.25rem 1.25rem; font-size: var(--text-xs); color: var(--graphite-strong); min-height: 1.4em; }
  .readout b { color: var(--ink); font-weight: 500; }
  .toggles { display: flex; flex-wrap: wrap; gap: 0.4rem 1.25rem; font-size: var(--text-sm); color: var(--graphite-strong); }
  .toggles label { display: flex; align-items: center; gap: 0.4rem; }
  .toggles input { accent-color: var(--ink); }
</style>
