<script lang="ts">
  /**
   * Velocity over time: the curve's slope. 1 = the speed of linear motion.
   * Reading a curve as speed: tall = fast, flat = slow, below zero = moving backwards.
   */
  import { easingFn, velocityCurve, type EasingSpec } from "@inbetween/core";
  import { resize } from "~/lib/actions";

  interface Props {
    spec: EasingSpec;
    compare?: EasingSpec | null;
    progress?: number | null;
    height?: number;
    index?: number;
  }
  let { spec, compare = null, progress = null, height = 260, index = 0 }: Props = $props();

  let w = $state(300);
  const M = { l: 34, r: 16, t: 16, b: 28 };
  const velA = $derived(velocityCurve(easingFn(spec).ease, 160));
  const velB = $derived(compare ? velocityCurve(easingFn(compare).ease, 160) : null);
  const peak = $derived(velA.reduce((m, p) => (Math.abs(p.v) > Math.abs(m.v) ? p : m), velA[0]));
  const vRange = $derived.by(() => {
    let lo = 0;
    let hi = 1.5;
    for (const p of [...velA, ...(velB ?? [])]) {
      if (!Number.isFinite(p.v)) continue;
      lo = Math.min(lo, p.v);
      hi = Math.max(hi, p.v);
    }
    hi = Math.min(hi, 12);
    lo = Math.max(lo, -6);
    return { lo, hi: hi * 1.08 };
  });
  const pw = $derived(Math.max(60, w - M.l - M.r));
  const ph = $derived(height - M.t - M.b);
  const X = (x: number) => M.l + x * pw;
  const Y = (v: number) => M.t + (1 - (Math.max(vRange.lo, Math.min(vRange.hi, v)) - vRange.lo) / (vRange.hi - vRange.lo)) * ph;
  const pathOf = (pts: { x: number; v: number }[]) => pts.map((p, i) => `${i ? "L" : "M"}${X(p.x).toFixed(2)},${Y(p.v).toFixed(2)}`).join("");
  const area = $derived(`${pathOf(velA)}L${X(1)},${Y(0)}L${X(0)},${Y(0)}Z`);
  const vAt = (pts: { x: number; v: number }[], x: number) => pts[Math.round(Math.max(0, Math.min(1, x)) * (pts.length - 1))].v;
</script>

<div class="velocity" use:resize={(width) => (w = width)}>
  <svg width={w} {height} viewBox={`0 0 ${w} ${height}`} role="img" aria-label={`Velocity over time. Peak ${peak.v.toFixed(1)} times linear at ${Math.round(peak.x * 100)}% of the duration.`}>
    <line class="grid" x1={X(0)} x2={X(1)} y1={Y(1)} y2={Y(1)} stroke-dasharray="1 4" />
    <line class="grid" x1={X(1)} x2={X(1)} y1={Y(vRange.lo)} y2={Y(vRange.hi)} />
    <line class="ax reveal-axes" pathLength="1" x1={X(0)} x2={X(0)} y1={Y(vRange.hi)} y2={Y(vRange.lo)} />
    <line class="ax reveal-axes" pathLength="1" x1={X(0)} x2={X(1)} y1={Y(0)} y2={Y(0)} />
    <text class="label" x={X(0) - 6} y={Y(0) + 3} text-anchor="end">0</text>
    <text class="label" x={X(0) - 6} y={Y(1) + 3} text-anchor="end">1×</text>
    <text class="label upper" x={X(1)} y={height - 6} text-anchor="end">time →</text>
    <text class="label upper" x={peak.x > 0.55 ? X(0) + 6 : X(1)} y={M.t + 2} text-anchor={peak.x > 0.55 ? "start" : "end"}>velocity</text>

    <path class="area reveal-ghosts" d={area} />
    {#if velB}<path class="path dashed reveal-ghosts" d={pathOf(velB)} />{/if}
    <path class="ink" d={pathOf(velA)} data-link={`${index}.easing`} />
    <g class="reveal-ghosts">
      <circle class="ghost-fill" cx={X(peak.x)} cy={Y(peak.v)} r="2.5" />
      <text class="label" x={X(peak.x) + (peak.x > 0.7 ? -8 : 8)} y={Y(peak.v) + (peak.x < 0.25 ? 14 : -6)} text-anchor={peak.x > 0.7 ? "end" : "start"}>peak {peak.v.toFixed(1)}×</text>
    </g>

    {#if progress != null}
      {@const p = Math.max(0, Math.min(1, progress))}
      <g class="reveal-key">
        <line class="key-stroke cursor" x1={X(p)} x2={X(p)} y1={Y(vRange.lo)} y2={Y(vRange.hi)} />
        <circle class="key" cx={X(p)} cy={Y(vAt(velA, p))} r="4.5" />
      </g>
    {/if}
  </svg>
</div>

<style>
  .velocity { width: 100%; }
  svg { display: block; overflow: visible; }
  .area { fill: color-mix(in srgb, var(--blue-pencil) 8%, transparent); stroke: none; }
  .cursor { stroke-width: 1; opacity: 0.55; }
</style>
