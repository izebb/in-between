<script lang="ts">
  /**
   * Scroll as time, in real CSS: the progress bar runs on animation-timeline: scroll(),
   * each card on view(). No JavaScript touches them. Switch to "scroll-jacked" to feel the
   * alternative: the page intercepts your wheel and eases toward it, and you're no longer in charge.
   */
  import { onMount } from "svelte";
  import { damp, createLoop, type Loop } from "@inbetween/core";

  let mode = $state<"native" | "triggered" | "jacked">("native");
  let supported = $state(true);
  let scroller: HTMLDivElement;
  let loop: Loop | null = null;
  let target = 0;

  onMount(() => {
    supported = typeof CSS !== "undefined" && CSS.supports("animation-timeline: scroll()");
    return () => {
      loop?.stop();
      io?.disconnect();
    };
  });

  function wheel(e: WheelEvent) {
    if (mode !== "jacked") return;
    e.preventDefault();
    target = Math.max(0, Math.min(scroller.scrollHeight - scroller.clientHeight, target + e.deltaY));
    if (!loop) {
      loop = createLoop(({ dt }) => {
        const next = damp(scroller.scrollTop, target, 4, dt); // deliberately sluggish: the jack
        scroller.scrollTop = next;
        if (Math.abs(next - target) < 0.5) {
          loop?.stop();
          loop = null;
        }
      });
    }
  }
  let io: IntersectionObserver | null = null;
  function setMode(m: "native" | "triggered" | "jacked") {
    mode = m;
    target = scroller.scrollTop;
    io?.disconnect();
    io = null;
    scroller.querySelectorAll(".card").forEach((c) => c.classList.remove("in"));
    if (m === "triggered") {
      // Time-based: each card plays its own reveal once it enters, at its own speed.
      io = new IntersectionObserver((entries) => {
        for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io?.unobserve(e.target); }
      }, { root: scroller, threshold: 0.35 });
      scroller.querySelectorAll(".card").forEach((c) => io!.observe(c));
    }
  }
  const cards = ["Timing", "Spacing", "Weight", "Springs", "Momentum", "Stagger", "Continuity", "The Loop"];
</script>

<div class="scrollfig">
  <div class="bar">
    <div class="seg" role="group" aria-label="Scroll mode">
      <button type="button" aria-pressed={mode === "native"} onclick={() => setMode("native")}>Native scroll</button>
      <button type="button" aria-pressed={mode === "triggered"} onclick={() => setMode("triggered")}>Triggered</button>
      <button type="button" aria-pressed={mode === "jacked"} onclick={() => setMode("jacked")}>Scroll-jacked</button>
    </div>
    {#if !supported}<span class="note">This browser doesn't support scroll-driven animations yet, so the cards simply appear.</span>{/if}
  </div>
  <div class="scroller" class:sd={supported && mode !== "triggered"} class:io={mode === "triggered"} bind:this={scroller} onwheel={wheel} tabindex="0" aria-label="Scrollable page">
    <div class="progress" aria-hidden="true"></div>
    <p class="intro serif">Scroll this page.</p>
    {#each cards as c, i (c)}
      <div class="card"><span class="mono n">{String(i + 1).padStart(2, "0")}</span><span class="serif">{c}</span></div>
    {/each}
    <p class="intro serif end">The end.</p>
  </div>
</div>

<style>
  .scrollfig { display: flex; flex-direction: column; gap: 0.75rem; }
  .bar { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
  .note { font-size: var(--text-sm); color: var(--graphite-strong); }
  .scroller { position: relative; height: 320px; max-width: 460px; overflow-y: auto; border: 1px solid var(--rule); border-radius: 10px; background: var(--paper); padding: 0 16px 16px; overscroll-behavior: contain; }
  .progress { position: sticky; top: 0; height: 3px; margin: 0 -16px 12px; background: var(--red-pencil); transform-origin: left; z-index: 2; }
  .intro { font-size: 1.4rem; color: var(--graphite-strong); padding: 40px 0; }
  .intro.end { padding-bottom: 80px; }
  .card { display: flex; align-items: baseline; gap: 12px; padding: 22px 16px; margin-bottom: 12px; border: 1px solid var(--rule); border-radius: 8px; background: var(--paper-raised); }
  .card .serif { font-size: 1.3rem; }
  .n { font-size: var(--text-xs); color: var(--graphite); }

  /* The scroll position is the timeline: no duration, no JavaScript. */
  @keyframes grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes reveal { from { opacity: 0; translate: 0 var(--dist-travel); } }
  .sd .progress { animation: grow linear both; animation-timeline: scroll(nearest block); }
  .sd .card { animation: reveal var(--ease-out) both; animation-timeline: view(); animation-range: entry 0% cover 30%; }
  /* Triggered: a time-based reveal once each card enters (IntersectionObserver). */
  .io .card { opacity: 0; translate: 0 var(--dist-travel); transition: opacity var(--dur-base) var(--ease-out), translate var(--dur-base) var(--ease-out); }
  .io .card:global(.in) { opacity: 1; translate: none; }
  @media (prefers-reduced-motion: reduce) {
    :global(:root:not([data-motion="full"])) .sd .card { animation: none; }
  }
  :global(:root[data-motion="reduce"]) .sd .card { animation: none; }
</style>
