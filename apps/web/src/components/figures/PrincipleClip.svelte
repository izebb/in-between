<script lang="ts">
  /** One principle clip on a canvas. Plays in a loop while `playing`; still = its onion skin. */
  import { onDestroy } from "svelte";
  import { createLoop, type Loop } from "@inbetween/core";
  import { principleById } from "~/lib/principles";
  import { prefs } from "~/lib/prefs.svelte";
  import { resize } from "~/lib/actions";

  let { id, playing = false, height = 130, period = 1.8 }: { id: string; playing?: boolean; height?: number; period?: number } = $props();
  const p = $derived(principleById(id));
  let canvas: HTMLCanvasElement;
  let w = $state(220);
  let loop: Loop | null = null;

  function paint(t: number | null) {
    const c = canvas?.getContext("2d");
    if (!c) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(height * dpr);
    }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, height);
    const pen = prefs.pencils;
    if (t === null) {
      // Still: an onion skin of the loop, ghosts in blue, the rest pose in red.
      const ghost = { ...pen, red: pen.blue };
      for (let i = 1; i < 8; i++) {
        c.globalAlpha = 0.18 + 0.05 * i;
        p.draw(c, i / 8 * 0.6, w, height, ghost);
      }
      c.globalAlpha = 1;
      p.draw(c, 0.62, w, height, pen);
      return;
    }
    p.draw(c, t, w, height, pen);
  }

  $effect(() => {
    void w;
    void prefs.pencils.red;
    if (playing && !prefs.reduced) {
      loop?.stop();
      loop = createLoop(({ time }) => paint((time % period) / period));
    } else {
      loop?.stop();
      loop = null;
      paint(null);
    }
  });
  onDestroy(() => loop?.stop());
</script>

<div class="clip" use:resize={(width) => (w = width)}>
  <canvas bind:this={canvas} style={`height:${height}px`} aria-label={`${p.name}: ${p.ui}`} role="img"></canvas>
</div>

<style>
  .clip { width: 100%; }
  canvas { display: block; width: 100%; border: 1px solid var(--rule); border-radius: 8px; background: var(--paper); }
</style>
