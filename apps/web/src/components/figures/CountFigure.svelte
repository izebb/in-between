<script lang="ts">
  /**
   * Numbers that change: instantly, counting up, or rolling digit by digit.
   * Tabular numerals keep every digit the same width, so a counting number doesn't jitter.
   */
  import { onDestroy, onMount } from "svelte";
  import { createLoop, cubicBezier, type Loop } from "@inbetween/core";
  import { prefs } from "~/lib/prefs.svelte";

  let { from = 1284, values = [3912, 2047, 9518, 1284], duration = 900 }: { from?: number; values?: number[]; duration?: number } = $props();

  let target = $state(from);
  let shown = $state(from);
  let prev = $state(from);
  let tabular = $state(true);
  let step = 0;
  let loop: Loop | null = null;
  let rollKey = $state(0);
  const ease = cubicBezier(0.2, 0.8, 0.2, 1);

  function next() {
    prev = target;
    target = values[step++ % values.length];
    rollKey++;
    loop?.stop();
    if (prefs.reduced) {
      shown = target;
      return;
    }
    const a = prev;
    const b = target;
    loop = createLoop(({ time }) => {
      const p = Math.min(1, (time * 1000) / duration);
      shown = Math.round(a + (b - a) * ease(p));
      if (p >= 1) return false;
    });
  }
  onMount(() => prefs.start());
  onDestroy(() => loop?.stop());

  const fmt = (n: number) => n.toLocaleString("en-US");
  const digits = $derived(fmt(target).split(""));
  const prevDigits = $derived(fmt(prev).padStart(fmt(target).length, " ").split(""));
</script>

<div class="count">
  <div class="controls">
    <button class="btn solid small" type="button" onclick={next}>New value</button>
    <label class="check"><input type="checkbox" bind:checked={tabular} /> Tabular numerals</label>
  </div>
  <div class="cols" class:proportional={!tabular}>
    <div class="col">
      <span class="smallcaps">Instant</span>
      <span class="num">{fmt(target)}</span>
    </div>
    <div class="col">
      <span class="smallcaps">Counting up</span>
      <span class="num">{fmt(shown)}</span>
    </div>
    <div class="col">
      <span class="smallcaps">Rolling digits</span>
      <span class="num roll" aria-label={fmt(target)}>
        {#each digits as d, i (i + "-" + rollKey)}
          {#if /\d/.test(d)}
            <span class="digit" style={`--from:${/\d/.test(prevDigits[i]) ? prevDigits[i] : 0};--to:${d};--delay:${i * 40}ms`}>
              <span class="strip" class:still={prefs.reduced}>{#each Array(10) as _, k (k)}<span>{k}</span>{/each}</span>
            </span>
          {:else}<span>{d}</span>{/if}
        {/each}
      </span>
    </div>
  </div>
</div>

<style>
  .count { display: flex; flex-direction: column; gap: 1rem; }
  .controls { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
  .check { display: flex; align-items: center; gap: 0.4rem; font-size: var(--text-sm); color: var(--graphite-strong); }
  .check input { accent-color: var(--ink); }
  .cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
  @media (max-width: 560px) { .cols { grid-template-columns: 1fr; } }
  .col { display: flex; flex-direction: column; gap: 0.4rem; border-top: 1px solid var(--rule); padding-top: 0.6rem; }
  .col .smallcaps { color: var(--graphite-strong); }
  /* Inter has true tabular figures (the display serif doesn't). */
  .num { font-family: var(--font-body); font-weight: 300; font-size: 2.6rem; line-height: 1; letter-spacing: -0.01em; font-variant-numeric: tabular-nums lining-nums; }
  .proportional .num { font-variant-numeric: proportional-nums lining-nums; }
  .roll { display: inline-flex; }
  .digit { display: inline-block; height: 1em; overflow: hidden; line-height: 1; }
  .strip { display: flex; flex-direction: column; translate: 0 calc(var(--to) * -1em); animation: roll var(--dur-scene) var(--ease-out) var(--delay) both; }
  .strip.still { animation: none; }
  .strip > span { height: 1em; }
  @keyframes roll { from { translate: 0 calc(var(--from) * -1em); } }
</style>
