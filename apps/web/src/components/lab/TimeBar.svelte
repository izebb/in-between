<script lang="ts">
  /**
   * TIME: scrubber · frame counter · rate · step. The Frame Stepper (L5) lives under every stage.
   * Scrubbing drives the playhead through a real spring (spring.snappy) with velocity carry-over,
   * so it feels like a physical dial. Under reduced motion it tracks the pointer directly.
   */
  import { onDestroy } from "svelte";
  import { createLoop, fromResponse, type Loop } from "@inbetween/core";
  import { spring as springTokens } from "~/motion/tokens";
  import { prefs } from "~/lib/prefs.svelte";
  import type { Transport } from "~/lib/transport.svelte";

  interface Props {
    transport: Transport;
    /** Show rate buttons and step controls (off for tiny embeds). */
    compact?: boolean;
    label?: string;
    /** Show milliseconds next to the frame count (off before a chapter's FEEL beat). */
    showMs?: boolean;
  }
  let { transport, compact = false, label = "Time", showMs = true }: Props = $props();

  const frameMs = $derived(1000 / transport.fps);
  const totalFrames = $derived(Math.max(1, Math.round(transport.duration / frameMs)));
  const frame = $derived(Math.min(totalFrames, Math.round(transport.time / frameMs)));
  const pct = $derived(Math.min(100, (transport.time / Math.max(1, transport.duration)) * 100));
  const rates = [1, 0.25, 0.1];

  // ---- spring scrub
  const sp = fromResponse(springTokens.snappy.response, springTokens.snappy.bounce);
  let track: HTMLElement;
  let target = 0;
  let pos = 0;
  let vel = 0;
  let loop: Loop | null = null;
  let scrubbing = $state(false);

  function timeAt(clientX: number) {
    const r = track.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    return p * transport.duration;
  }

  function run() {
    if (loop) return;
    loop = createLoop(({ dt }) => {
      // Semi-implicit Euler on a critically damped spring: velocity survives retargeting.
      const force = -sp.stiffness * (pos - target) - sp.damping * vel;
      vel += (force / sp.mass) * dt;
      pos += vel * dt;
      transport.seek(pos);
      if (!scrubbing && Math.abs(pos - target) < 0.5 && Math.abs(vel) < 5) {
        transport.seek(target);
        loop?.stop();
        loop = null;
      }
    });
  }

  function down(e: PointerEvent) {
    if (e.button !== 0) return;
    transport.pause();
    scrubbing = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pos = transport.time;
    vel = 0;
    target = timeAt(e.clientX);
    if (prefs.reduced) transport.seek(target);
    else run();
  }
  function move(e: PointerEvent) {
    if (!scrubbing) return;
    target = timeAt(e.clientX);
    if (prefs.reduced) transport.seek(target);
  }
  function up() {
    scrubbing = false;
  }
  function key(e: KeyboardEvent) {
    if (e.key === "ArrowRight") { e.preventDefault(); transport.step(e.shiftKey ? 10 : 1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); transport.step(e.shiftKey ? -10 : -1); }
    if (e.key === " " || e.key === "k") { e.preventDefault(); transport.toggle(); }
    if (e.key === "Home") { e.preventDefault(); transport.seek(0); }
  }
  onDestroy(() => loop?.stop());
</script>

<div class="tb-box">
<div class="timebar" class:compact>
  <div class="controls">
    <button class="btn icon ghost" type="button" onclick={() => transport.restart()} title="Restart" aria-label="Restart">
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 3v10M13 3.5v9L6 8z" fill="currentColor" stroke="currentColor" stroke-width="1" /></svg>
    </button>
    {#if !compact}
      <button class="btn icon ghost" type="button" onclick={() => transport.step(-1)} title="Back one frame (←)" aria-label="Back one frame">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M11 3.5v9L5 8zM4 3.5v9" fill="currentColor" stroke="currentColor" stroke-width="1" /></svg>
      </button>
    {/if}
    <button class="btn icon" type="button" onclick={() => transport.toggle()} title="Play / pause (space)" aria-label={transport.playing ? "Pause" : "Play"}>
      {#if transport.playing}
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5h2v9H5zM9.5 3.5h2v9h-2z" fill="currentColor" /></svg>
      {:else}
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3v10l8-5z" fill="currentColor" /></svg>
      {/if}
    </button>
    {#if !compact}
      <button class="btn icon ghost" type="button" onclick={() => transport.step(1)} title="Forward one frame (→)" aria-label="Forward one frame">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9L11 8zM12 3.5v9" fill="currentColor" stroke="currentColor" stroke-width="1" /></svg>
      </button>
      <div class="seg rates" role="group" aria-label="Playback rate">
        {#each rates as r (r)}
          <button type="button" aria-pressed={transport.rate === r} onclick={() => transport.setRate(r)}>{r === 1 ? "1×" : `${r}×`}</button>
        {/each}
      </div>
    {/if}
  </div>

  <div
    class="track"
    bind:this={track}
    role="slider"
    tabindex="0"
    aria-label={`${label} scrubber`}
    aria-valuemin={0}
    aria-valuemax={Math.round(transport.duration)}
    aria-valuenow={Math.round(transport.time)}
    aria-valuetext={`frame ${frame} of ${totalFrames}`}
    onpointerdown={down}
    onpointermove={move}
    onpointerup={up}
    onpointercancel={up}
    onkeydown={key}
  >
    <svg class="ticks" preserveAspectRatio="none" viewBox={`0 0 ${totalFrames} 10`} aria-hidden="true">
      {#if totalFrames <= 180}
        {#each Array(totalFrames + 1) as _, i}
          <line x1={i} x2={i} y1={i % 5 === 0 ? 2 : 5} y2="10" />
        {/each}
      {/if}
    </svg>
    <div class="fill" style={`width:${pct}%`}></div>
    <div class="head" style={`left:${pct}%`}></div>
  </div>

  <div class="counter mono" aria-live="off">
    <span><b>{String(frame).padStart(String(totalFrames).length, "0")}</b>/{totalFrames} fr</span>
    {#if showMs}<span class="ms">{Math.round(transport.time)}ms</span>{/if}
  </div>
</div>
</div>

<style>
  /* Sized by its own column, so a narrow embed stacks the scrubber the same way a phone does. */
  .tb-box { container-type: inline-size; min-width: 0; }
  .timebar { display: flex; align-items: center; gap: 0.75rem; min-width: 0; }
  .controls { display: flex; align-items: center; gap: 0.2rem; flex: none; }
  .controls svg { width: 13px; height: 13px; }
  .rates { margin-left: 0.4rem; }
  .track {
    position: relative;
    flex: 1;
    min-width: 80px;
    height: 28px;
    cursor: ew-resize;
    touch-action: none;
    border-radius: 3px;
  }
  .ticks { position: absolute; left: 0; right: 0; bottom: 8px; width: 100%; height: 10px; }
  .ticks line { stroke: var(--graphite); stroke-width: 1; vector-effect: non-scaling-stroke; opacity: 0.55; }
  .fill { position: absolute; left: 0; bottom: 8px; height: 1px; background: var(--graphite); }
  .track::before { content: ""; position: absolute; left: 0; right: 0; bottom: 8px; height: 1px; background: var(--rule); }
  .head {
    position: absolute;
    bottom: 3px;
    width: 2px;
    height: 22px;
    margin-left: -1px;
    background: var(--red-pencil);
    border-radius: 1px;
  }
  .head::before { content: ""; position: absolute; top: -3px; left: -3px; width: 8px; height: 8px; border-radius: 50%; background: var(--red-pencil); }
  .counter { display: flex; flex-direction: column; align-items: flex-end; font-size: var(--text-xs); color: var(--graphite-strong); line-height: 1.3; min-width: 4.5rem; font-variant-numeric: tabular-nums; }
  .counter b { color: var(--ink); font-weight: 500; }
  .counter span { white-space: nowrap; }
  .compact .counter .ms { display: none; }
  @container (max-width: 520px) {
    .timebar { flex-wrap: wrap; row-gap: 0.25rem; }
    .track { order: 3; flex-basis: 100%; }
    .counter { margin-left: auto; }
  }
</style>
