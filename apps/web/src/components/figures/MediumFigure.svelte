<script lang="ts">
  /**
   * The same N dots moved three ways: DOM with transform, DOM with left/top, and Canvas.
   * The readout is measured, on your machine, right now. Runs only while on screen.
   */
  import { onMount, onDestroy, tick, untrack } from "svelte";
  import { createLoop, type Loop } from "@inbetween/core";
  import { prefs, watchPlateStill } from "~/lib/prefs.svelte";
  import { resize } from "~/lib/actions";

  let { initial = 800, modes = ["transform", "left", "canvas"], readout = true }: { initial?: number; modes?: ("transform" | "left" | "canvas")[]; readout?: boolean } = $props();

  let n = $state(initial);
  let mode = $state<"transform" | "left" | "canvas">(modes[0]);
  let w = $state(600);
  const H = 260;
  let host: HTMLDivElement;
  let canvas: HTMLCanvasElement;
  let loop: Loop | null = null;
  /** Seconds of motion so far. Kept across restarts, so changing the mode or the count never jumps the dots. */
  let clock = 0;
  let frameMs = $state(0);
  let fps = $state(0);
  let visible = false;
  let plateStill = $state(false);
  /** Under reduced motion or Still, the test runs only when the reader asks for it. */
  let requested = $state(false);
  const held = $derived((prefs.reduced || plateStill) && !requested);
  let dots: HTMLElement[] = [];
  const cap = $derived(mode === "canvas" ? 20000 : 3000);

  function positions(i: number, t: number) {
    const a = t * (0.6 + (i % 7) * 0.1) + i;
    const r = 20 + ((i * 37) % 110);
    return [w / 2 + Math.cos(a) * r * (w / 300), H / 2 + Math.sin(a * 1.3) * r * 0.9];
  }

  async function build() {
    host.replaceChildren();
    dots = [];
    if (mode === "canvas") return;
    await tick();
    const frag = document.createDocumentFragment();
    for (let i = 0; i < Math.min(n, cap); i++) {
      const d = document.createElement("span");
      d.className = "d";
      frag.appendChild(d);
      dots.push(d);
    }
    host.appendChild(frag);
  }

  function frame(t: number) {
    const count = Math.min(n, cap);
    if (mode === "canvas") {
      const c = canvas.getContext("2d")!;
      const dpr = Math.min(2, devicePixelRatio || 1);
      if (canvas.width !== Math.round(w * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(H * dpr);
      }
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.clearRect(0, 0, w, H);
      c.fillStyle = prefs.pencils.ink;
      c.beginPath();
      for (let i = 0; i < count; i++) {
        const [x, y] = positions(i, t);
        c.moveTo(x + 3, y);
        c.arc(x, y, 3, 0, Math.PI * 2);
      }
      c.fill();
    } else {
      for (let i = 0; i < dots.length; i++) {
        const [x, y] = positions(i, t);
        if (mode === "transform") dots[i].style.transform = `translate(${x}px, ${y}px)`;
        else {
          dots[i].style.left = `${x}px`;
          dots[i].style.top = `${y}px`;
        }
      }
    }
  }

  function start() {
    loop?.stop();
    if (!visible) return;
    if ((prefs.reduced || plateStill) && !requested) {
      frame(clock);
      return;
    }
    let samples: number[] = [];
    let lastT = performance.now();
    // The first frames after a change pay for building the dots, once. Measure the steady state.
    let warmup = 6;
    loop = createLoop(({ dt }) => {
      const now = performance.now();
      if (warmup > 0) warmup--;
      else samples.push(now - lastT);
      lastT = now;
      if (samples.length >= 30) {
        const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
        frameMs = avg;
        fps = 1000 / avg;
        samples = [];
      }
      clock += dt;
      frame(clock);
    });
  }

  $effect(() => {
    if (prefs.reduced) untrack(() => (requested = false));
  });

  $effect(() => {
    void n;
    void mode;
    void requested;
    void plateStill;
    void prefs.reduced;
    build().then(start);
  });

  onMount(() => {
    prefs.start();
    const io = new IntersectionObserver((es) => {
      visible = es.some((e) => e.isIntersecting);
      if (visible) start();
      else loop?.stop();
    });
    io.observe(host.parentElement!);
    // Turning Still back on stops a test the reader ran: the toggle always wins.
    const off = watchPlateStill(host, (v) => {
      plateStill = v;
      if (v) requested = false;
    });
    return () => {
      io.disconnect();
      off();
    };
  });
  onDestroy(() => loop?.stop());
  const labels = { transform: "DOM · transform", left: "DOM · left/top", canvas: "Canvas 2D" };
</script>

<div class="medium">
  <div class="controls">
    <div class="seg" role="group" aria-label="Medium">
      {#each modes as m (m)}<button type="button" aria-pressed={mode === m} onclick={() => (mode = m)}>{labels[m]}</button>{/each}
    </div>
    <label class="count">
      <span class="label">Dots</span>
      <input type="range" min="100" max="6000" step="100" bind:value={n} aria-label="Number of dots" />
      <span class="mono">{n}{n > cap ? ` (DOM capped at ${cap})` : ""}</span>
    </label>
  </div>
  <div class="stage" use:resize={(width) => (w = width)} style={`height:${H}px`}>
    <div class="dom" class:hidden={mode === "canvas"} bind:this={host}></div>
    <canvas bind:this={canvas} class:hidden={mode !== "canvas"} style={`height:${H}px`}></canvas>
  </div>
  <div class="readout mono" aria-live="off">
    {#if held}
      <span>Still. The test moves the dots, so it runs only when you ask.</span>
      <button class="btn small" type="button" onclick={() => (requested = true)}>Run the test</button>
    {:else if readout}
      <span>frame <b>{frameMs ? frameMs.toFixed(1) : "—"}</b>ms</span>
      <span><b>{fps ? Math.round(fps) : "—"}</b> fps</span>
      <span>budget {Math.round(1000 / 60 * 10) / 10}ms at 60Hz · 8.3ms at 120Hz</span>
    {/if}
  </div>
</div>

<style>
  .medium { display: flex; flex-direction: column; gap: 0.75rem; }
  .controls { display: flex; flex-wrap: wrap; gap: 0.75rem 1.5rem; align-items: center; }
  .count { display: flex; align-items: center; gap: 0.6rem; font-size: var(--text-sm); }
  .count input { accent-color: var(--ink); width: 180px; }
  .stage { position: relative; overflow: hidden; border: 1px solid var(--rule); border-radius: 8px; background: var(--paper); }
  .dom { position: absolute; inset: 0; }
  .dom :global(.d) { position: absolute; left: 0; top: 0; width: 6px; height: 6px; margin: -3px 0 0 -3px; border-radius: 50%; background: var(--ink); }
  canvas { display: block; width: 100%; }
  .hidden { display: none; }
  .readout { display: flex; flex-wrap: wrap; align-items: center; gap: 0.25rem 1.25rem; font-size: var(--text-xs); color: var(--graphite-strong); }
  .readout b { color: var(--ink); font-weight: 500; }
</style>
