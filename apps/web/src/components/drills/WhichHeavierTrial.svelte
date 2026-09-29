<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { createLoop, type Loop } from "@inbetween/core";
  import { simulateDrop, type WhichHeavierSpec } from "~/lib/drills/which-heavier";
  import type { Scored } from "~/lib/drills/types";
  import { prefs } from "~/lib/prefs.svelte";

  let { spec, result, onanswer }: { spec: WhichHeavierSpec; result: Scored | null; onanswer: (v: number) => void } = $props();

  const SECONDS = 2.2;
  const DT = 1 / 120;
  const paths = spec.balls.map((b) => simulateDrop(b, SECONDS, DT));
  let canvases: HTMLCanvasElement[] = $state([]);
  let loop: Loop | null = null;
  let t = $state(SECONDS);

  function draw(i: number, time: number, ghosts: boolean) {
    const cv = canvases[i];
    if (!cv) return;
    const c = cv.getContext("2d")!;
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    const dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== Math.round(w * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
    }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    const p = prefs.pencils;
    const floor = h - 22;
    const top = 22;
    c.strokeStyle = p.graphite;
    c.beginPath();
    c.moveTo(12, floor + 12);
    c.lineTo(w - 12, floor + 12);
    c.stroke();
    const at = (k: number) => {
      const y = top + (floor - top) * paths[i][Math.min(paths[i].length - 1, k)];
      const x = 24 + (w - 48) * (k / (paths[i].length - 1));
      return [x, y] as const;
    };
    const k = Math.min(paths[i].length - 1, Math.round(time / DT));
    if (ghosts) {
      c.strokeStyle = p.blue;
      for (let j = 0; j < k; j += 8) {
        const [x, y] = at(j);
        c.beginPath();
        c.arc(x, y, 10, 0, Math.PI * 2);
        c.stroke();
      }
    }
    const [x, y] = at(k);
    c.fillStyle = p.red;
    c.beginPath();
    c.arc(x, y, 11, 0, Math.PI * 2);
    c.fill();
  }

  const drawAll = (time: number, ghosts: boolean) => [0, 1].forEach((i) => draw(i, time, ghosts));

  function play() {
    loop?.stop();
    t = 0;
    loop = createLoop(({ time }) => {
      t = Math.min(SECONDS, time);
      drawAll(t, false);
      if (time >= SECONDS) {
        drawAll(SECONDS, true);
        return false;
      }
    });
  }

  onMount(() => {
    prefs.start();
    drawAll(SECONDS, true);
    if (!prefs.reduced) setTimeout(play, 350);
  });
  onDestroy(() => loop?.stop());
  $effect(() => {
    if (result) drawAll(SECONDS, true);
  });
</script>

<div class="trial">
  <div class="pair">
    {#each [0, 1] as i (i)}
      <div class="side" class:right={result && i === spec.heavy} class:wrong={result && i === result.answer && i !== spec.heavy}>
        <canvas bind:this={canvases[i]} aria-label={`Ball ${i === 0 ? "A" : "B"}`}></canvas>
        <button class="btn small" type="button" disabled={!!result} onclick={() => onanswer(i)}>{i === 0 ? "A" : "B"} is heavier</button>
      </div>
    {/each}
  </div>
  <button class="btn ghost small" type="button" onclick={play}>{prefs.reduced ? "Play" : "Replay both"}</button>
</div>

<style>
  .trial { display: flex; flex-direction: column; gap: 0.6rem; align-items: flex-start; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; width: 100%; }
  @media (max-width: 520px) { .pair { grid-template-columns: 1fr; } }
  .side { display: flex; flex-direction: column; gap: 0.5rem; }
  canvas { width: 100%; height: 190px; border: 1px solid var(--rule); border-radius: 8px; background: var(--paper); }
  .side.right canvas { border-color: var(--ink); }
  .side.wrong canvas { border-style: dashed; }
</style>
