<script lang="ts">
  /**
   * The calibration graph: your estimates against the truth. Points on the diagonal are perfect.
   * Over sessions the cloud should tighten toward the line: the visible proof of intuition forming.
   */
  import type { DrillDef } from "~/lib/drills/types";
  import { sessionMeasure } from "~/lib/drills";
  import type { DrillSession } from "~/lib/store";
  import { resize } from "~/lib/actions";

  let { def, sessions, height = 260 }: { def: DrillDef<any, any>; sessions: DrillSession[]; height?: number } = $props();

  let w = $state(480);
  const M = { l: 44, r: 12, t: 12, b: 34 };
  const sorted = $derived([...sessions].sort((a, b) => a.at - b.at));
  const pts = $derived(sorted.flatMap((s, si) => s.trials.map((t) => ({ x: t.truth, y: t.answer, si }))));
  const lo = $derived(Math.max(1, Math.min(...pts.map((p) => Math.min(p.x, p.y)), 50)));
  const hi = $derived(Math.max(...pts.map((p) => Math.max(p.x, p.y)), 1200));
  // Log axes: a 50ms error at 100ms matters more than at 1000ms.
  const L = (v: number) => Math.log(Math.max(lo, v));
  const plot = $derived(Math.max(160, Math.min(300, w < 560 ? w - M.l - M.r : w * 0.5 - M.l - M.r, height)));
  const X = (v: number) => M.l + ((L(v) - L(lo)) / (L(hi) - L(lo))) * plot;
  const Y = (v: number) => M.t + plot - ((L(v) - L(lo)) / (L(hi) - L(lo))) * plot;
  const ticks = $derived([50, 100, 200, 500, 1000, 2000].filter((t) => t >= lo && t <= hi));

  // Per session: the mean error, the line that should fall; or the share right, the line that should rise.
  const line = $derived(sorted.map((s) => sessionMeasure(def.kind, s)));
  const TW = $derived(w < 560 ? w - 20 : w * 0.4);
  const TH = 120;
  const tMax = $derived(def.kind === "estimate" ? Math.max(40, ...line) : 100);
  const tx = (i: number) => 10 + (line.length <= 1 ? TW / 2 : (i / (line.length - 1)) * (TW - 20));
  const ty = (v: number) => 14 + (1 - v / tMax) * (TH - 34);
  const last = $derived(sorted.length - 1);
  // What the axes measure: "duration" for Guess the duration, "response" for Tune to match.
  const q = $derived(def.quantity ?? "value");
</script>

<div class="calibration fig" use:resize={(width) => (w = width)}>
  {#if def.kind === "estimate"}
    <svg class="scatter" width={M.l + plot + M.r} height={M.t + plot + M.b} role="img" aria-label={`Calibration for ${def.name}: ${pts.length} estimates against the truth.`}>
      {#each ticks as t (t)}
        <line class="grid" x1={X(t)} x2={X(t)} y1={Y(lo)} y2={Y(hi)} />
        <line class="grid" x1={X(lo)} x2={X(hi)} y1={Y(t)} y2={Y(t)} />
        <text class="label" x={X(t)} y={M.t + plot + 14} text-anchor="middle">{t}</text>
        <text class="label" x={M.l - 6} y={Y(t) + 3} text-anchor="end">{t}</text>
      {/each}
      <line class="ax" x1={X(lo)} y1={Y(lo)} x2={X(hi)} y2={Y(hi)} stroke-dasharray="3 4" />
      <text class="label upper" x={M.l + plot} y={M.t + plot + 30} text-anchor="end">{q}, true ({def.unit}) →</text>
      <text class="label upper" x={M.l} y={M.t - 4}>{q}, yours ↑</text>
      {#each pts as p, i (i)}
        {#if p.si === last}
          <circle class="key" cx={X(p.x)} cy={Y(p.y)} r="3.5" />
        {:else}
          <circle class="ghost" cx={X(p.x)} cy={Y(p.y)} r="3" opacity={0.25 + 0.6 * (p.si / Math.max(1, last))} />
        {/if}
      {/each}
    </svg>
  {/if}
  {#if sorted.length > 1 || def.kind === "choice"}
    <svg class="trend" width={TW} height={TH} role="img" aria-label={def.kind === "estimate" ? "Average error per session" : "Accuracy per session"}>
      <text class="label upper" x="10" y="10">{def.kind === "estimate" ? `average ${q} error, % · lower is better` : "accuracy, % · higher is better"}</text>
      <line class="grid" x1="10" x2={TW - 10} y1={ty(0)} y2={ty(0)} />
      <path class="ink" d={line.map((v, i) => `${i ? "L" : "M"}${tx(i)},${ty(v)}`).join("")} />
      {#each line as v, i (i)}
        <circle class={i === line.length - 1 ? "key" : "ghost-fill"} cx={tx(i)} cy={ty(v)} r="3" />
      {/each}
      {#if line.length}<text class="label ink-label" x={tx(line.length - 1)} y={ty(line[line.length - 1]) - 8} text-anchor="end">{Math.round(line[line.length - 1])}%</text>{/if}
    </svg>
  {/if}
</div>

<style>
  .calibration { display: flex; flex-wrap: wrap; gap: 1.5rem; align-items: flex-end; }
  svg { display: block; overflow: visible; }
</style>
