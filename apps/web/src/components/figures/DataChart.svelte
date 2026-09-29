<script lang="ts">
  /**
   * Draws the marks of a Data stage transition at one moment, in SVG or on a Canvas.
   * The tracked datum is drawn in red pencil so you can follow one identity through the move.
   * Value labels fade in only once everything has settled (the eye arrives after the motion stops),
   * and fade out, quicker, as the next change begins. Both renderers draw the same chart.
   */
  import { untrack } from "svelte";
  import { fade as fadeTick } from "svelte/transition";
  import { scaleLinear } from "d3-scale";
  import { createLoop, cubicBezier, type Loop } from "@inbetween/core";
  import type { Mark, Frame } from "~/lib/datastage";
  import { prefs } from "~/lib/prefs.svelte";
  import { duration, exitDuration, easing } from "~/motion/tokens";

  interface Props {
    marks: Mark[];
    frame: Frame;
    max: number;
    renderer?: "svg" | "canvas";
    tracked?: string | null;
    settled?: boolean;
    labels?: boolean;
    ontrack?: (id: string) => void;
    /** Baseline override for the "lies" drill (a truncated axis). */
    axisMin?: number;
  }
  let { marks, frame, max, renderer = "svg", tracked = null, settled = true, labels = true, ontrack, axisMin = 0 }: Props = $props();

  const y = $derived(scaleLinear().domain([axisMin, max]).range([frame.height - frame.padB, frame.padT]));
  const ticks = $derived(y.ticks(4));
  const short = (name: string) => name.slice(0, frame.width < 480 ? 1 : 3);
  const shows = (m: Mark) => settled && m.opacity > 0.99;
  let canvas: HTMLCanvasElement | undefined = $state();

  // The canvas has no CSS to fade its value labels, so it tweens their alpha on the same tokens as the SVG.
  let valueAlpha = $state(0);
  let fade: Loop | null = null;
  const easeIn = cubicBezier(...easing.in);
  const easeOut = cubicBezier(...easing.out);
  $effect(() => {
    const on = settled;
    if (renderer !== "canvas") return;
    untrack(() => {
      fade?.stop();
      const from = valueAlpha;
      const ms = on ? duration.quick : exitDuration.quick;
      const ease = on ? easeOut : easeIn;
      fade = createLoop(({ time }) => {
        const p = Math.min(1, (time * 1000) / ms);
        valueAlpha = from + ((on ? 1 : 0) - from) * ease(p);
        if (p >= 1) return false;
      });
    });
  });
  $effect(() => () => fade?.stop());

  $effect(() => {
    if (renderer !== "canvas" || !canvas) return;
    const c = canvas.getContext("2d")!;
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(frame.width * dpr);
    canvas.height = Math.round(frame.height * dpr);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, frame.width, frame.height);
    const p = prefs.pencils;
    const css = getComputedStyle(canvas);
    const labelInk = css.getPropertyValue("--graphite-strong").trim() || p.graphite;
    const base = frame.height - frame.padB;
    c.lineWidth = 1;
    c.font = `10px ${css.getPropertyValue("--font-mono").trim() || "ui-monospace, monospace"}`;
    c.textAlign = "left";
    for (const t of ticks) {
      c.strokeStyle = p.rule;
      c.beginPath();
      c.moveTo(frame.padL, Math.round(y(t)) + 0.5);
      c.lineTo(frame.width - 8, Math.round(y(t)) + 0.5);
      c.stroke();
      c.fillStyle = labelInk;
      c.fillText(String(t), 4, y(t) + 3);
    }
    c.strokeStyle = p.graphite;
    c.beginPath();
    c.moveTo(frame.padL, Math.round(base) + 0.5);
    c.lineTo(frame.width - 8, Math.round(base) + 0.5);
    c.stroke();
    c.textAlign = "center";
    for (const m of marks) {
      const a = Math.max(0, Math.min(1, m.opacity));
      c.globalAlpha = a;
      c.fillStyle = m.id === tracked ? p.red : p.ink;
      c.fillRect(m.x, m.y, m.w, Math.max(0, m.h));
      if (!labels) continue;
      c.fillStyle = labelInk;
      c.fillText(short(m.name), m.x + m.w / 2, base + 13);
      if (shows(m) && valueAlpha > 0) {
        c.globalAlpha = valueAlpha;
        c.fillStyle = p.ink;
        c.fillText(String(Math.round(m.value)), m.x + m.w / 2, m.y - 5);
      }
    }
    c.globalAlpha = 1;
  });
</script>

<div class="datachart" style={`height:${frame.height}px`}>
  {#if renderer === "svg"}
    <svg width={frame.width} height={frame.height} role="img" aria-label="Bar chart">
      <!-- A tick that joins or leaves the axis (a baseline sliding) fades, rather than blinking. -->
      {#each ticks as t (t)}
        <g in:fadeTick={{ duration: duration.quick }} out:fadeTick={{ duration: exitDuration.quick }}>
          <line class="grid" x1={frame.padL} x2={frame.width - 8} y1={y(t)} y2={y(t)} />
          <text class="label" x="4" y={y(t) + 3}>{t}</text>
        </g>
      {/each}
      <line class="ax" x1={frame.padL} x2={frame.width - 8} y1={frame.height - frame.padB} y2={frame.height - frame.padB} />
      {#each marks as m (m.key ?? m.id)}
        <rect
          class="bar"
          class:tracked={m.id === tracked}
          x={m.x}
          y={m.y}
          width={m.w}
          height={Math.max(0, m.h)}
          opacity={Math.max(0, Math.min(1, m.opacity))}
          role="button"
          tabindex="-1"
          aria-label={`${m.name}: ${Math.round(m.value)}`}
          onclick={() => ontrack?.(m.id)}
        />
        {#if labels}
          <text class="label name" x={m.x + m.w / 2} y={frame.height - frame.padB + 13} text-anchor="middle" opacity={m.opacity}>{short(m.name)}</text>
          <text class="label value" class:shown={shows(m)} x={m.x + m.w / 2} y={m.y - 5} text-anchor="middle">{Math.round(m.value)}</text>
        {/if}
      {/each}
    </svg>
  {:else}
    <canvas bind:this={canvas} style={`width:${frame.width}px;height:${frame.height}px`} aria-label="Bar chart (canvas)"></canvas>
  {/if}
</div>

<style>
  .datachart { position: relative; }
  svg { display: block; overflow: visible; }
  .bar { fill: var(--ink); cursor: pointer; }
  .bar.tracked { fill: var(--red-pencil); }
  /* Values go first when a change begins, and come back once everything has stopped. */
  .value { fill: var(--ink); opacity: 0; transition: opacity var(--dur-quick-exit) var(--ease-in); }
  .value.shown { opacity: 1; transition: opacity var(--dur-quick) var(--ease-out); }
  canvas { display: block; }
</style>
