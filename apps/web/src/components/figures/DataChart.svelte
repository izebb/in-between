<script lang="ts">
  /**
   * Draws the marks of a Data Stage transition at one moment, in SVG or on a Canvas.
   * The tracked datum is drawn in red pencil so you can follow one identity through the move.
   * Value labels appear only once everything has settled: the eye arrives after the motion stops.
   */
  import { scaleLinear } from "d3-scale";
  import type { Mark, Frame } from "~/lib/datastage";
  import { prefs } from "~/lib/prefs.svelte";

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
  let canvas: HTMLCanvasElement | undefined = $state();

  $effect(() => {
    if (renderer !== "canvas" || !canvas) return;
    const c = canvas.getContext("2d")!;
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(frame.width * dpr);
    canvas.height = Math.round(frame.height * dpr);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, frame.width, frame.height);
    const p = prefs.pencils;
    c.strokeStyle = p.rule;
    c.fillStyle = p.graphite;
    c.font = "10px ui-monospace, monospace";
    for (const t of ticks) {
      c.beginPath();
      c.moveTo(frame.padL, y(t));
      c.lineTo(frame.width - 8, y(t));
      c.stroke();
      c.fillText(String(t), 4, y(t) + 3);
    }
    for (const m of marks) {
      c.globalAlpha = Math.max(0, Math.min(1, m.opacity));
      c.fillStyle = m.id === tracked ? p.red : p.ink;
      c.fillRect(m.x, m.y, m.w, Math.max(0, m.h));
    }
    c.globalAlpha = 1;
  });
</script>

<div class="datachart" style={`height:${frame.height}px`}>
  {#if renderer === "svg"}
    <svg width={frame.width} height={frame.height} role="img" aria-label="Bar chart">
      {#each ticks as t (t)}
        <line class="grid" x1={frame.padL} x2={frame.width - 8} y1={y(t)} y2={y(t)} />
        <text class="label" x="4" y={y(t) + 3}>{t}</text>
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
          <text class="label name" x={m.x + m.w / 2} y={frame.height - frame.padB + 13} text-anchor="middle" opacity={m.opacity}>{m.name.slice(0, frame.width < 480 ? 1 : 3)}</text>
        {/if}
        {#if labels && settled && m.opacity > 0.99}
          <text class="label value" x={m.x + m.w / 2} y={m.y - 5} text-anchor="middle">{Math.round(m.value)}</text>
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
  .value { fill: var(--ink); transition: opacity var(--dur-quick) var(--ease-out); }
  @starting-style { .value { opacity: 0; } }
  canvas { display: block; }
</style>
