<script lang="ts">
  /**
   * The spacing chart: an object's positions per frame, drawn as onion-skin ghosts,
   * with the animator's tick chart underneath (keys circled in red, inbetweens in blue).
   * Seeing spacing = seeing easing.
   */
  import { resolveMove, frameTimes, type Move } from "@inbetween/core";
  import { resize } from "~/lib/actions";

  export interface Row {
    move: Move;
    label?: string;
    /** red = what is (default); blue = a comparison, what could be. */
    tone?: "red" | "blue";
  }

  interface Props {
    rows: Row[];
    /** Playhead, ms. */
    time: number;
    fps?: number;
    still?: boolean;
    ghosts?: "always" | "hover" | "none";
    chart?: boolean;
    object?: "dot" | "square";
    /** Show per-row frame count and duration at the right. */
    readout?: boolean;
    rowHeight?: number;
    /** Link prefix for code ↔ stage hover (row i → `${i}`). */
    linked?: boolean;
  }
  let {
    rows,
    time,
    fps = 60,
    still = false,
    ghosts = "always",
    chart = true,
    object = "dot",
    readout = true,
    rowHeight,
    linked = false,
  }: Props = $props();

  let w = $state(600);
  const PAD_L = 28;
  const PAD_R = 28;
  const rowH = $derived(rowHeight ?? (chart ? 92 : 58));
  const H = $derived(rows.length * rowH + 6);

  const resolved = $derived(rows.map((r) => resolveMove(r.move)));
  const spatial = $derived(rows.every((r) => r.move.property === "x" || r.move.property === "y"));
  const range = $derived.by(() => {
    if (!spatial) return { lo: 0, hi: 1 };
    let lo = Infinity;
    let hi = -Infinity;
    for (const r of rows) {
      lo = Math.min(lo, r.move.from, r.move.to);
      hi = Math.max(hi, r.move.from, r.move.to);
    }
    return hi > lo ? { lo, hi } : { lo: 0, hi: 1 };
  });

  const xOf = (i: number, t: number) => {
    const r = resolved[i];
    const v = spatial ? r.value(t) : r.progress(t);
    return PAD_L + ((v - range.lo) / (range.hi - range.lo)) * (w - PAD_L - PAD_R);
  };

  const data = $derived(
    rows.map((row, i) => {
      const r = resolved[i];
      const times = frameTimes(r.end, fps);
      const xs = times.map((t) => xOf(i, t));
      // Thin labels so they never collide where frames bunch up.
      const labels: { x: number; n: number }[] = [];
      let lastX = -Infinity;
      xs.forEach((x, n) => {
        const isLast = n === xs.length - 1;
        if (x - lastX >= 16 || isLast) {
          if (isLast && labels.length && x - labels[labels.length - 1].x < 16 && labels.length > 1) labels.pop();
          labels.push({ x, n });
          lastX = x;
        }
      });
      const scaleOf = (t: number) => (row.move.property === "scale" ? r.value(t) : 1);
      const opacityOf = (t: number) => (row.move.property === "opacity" ? Math.max(0, Math.min(1, r.value(t))) : 1);
      return { row, r, times, xs, labels, frames: times.length - 1, scaleOf, opacityOf };
    }),
  );

  const R = 9;
</script>

<div class="spacing" use:resize={(width) => (w = Math.max(240, width))}>
  <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="img" aria-label={`Spacing chart: ${rows.map((r, i) => `${r.label ?? "motion"}, ${data[i].frames} frames`).join("; ")}`}>
    {#each data as d, i (i)}
      {@const y0 = i * rowH + (chart ? 34 : 30)}
      {@const tNow = still ? d.r.end : Math.min(time, d.r.end)}
      {@const xNow = xOf(i, tNow)}
      <g data-link={linked ? `${i}` : undefined}>
        {#if d.row.label || readout}
          <text class="label upper" x={PAD_L - 6} y={y0 - 20}>{d.row.label ?? ""}</text>
          {#if readout}
            <text class="label" x={w - PAD_R + 6} y={y0 - 20} text-anchor="end">{d.frames} fr · {Math.round(d.r.duration)}ms</text>
          {/if}
        {/if}
        <line class="ax reveal-axes" pathLength="1" x1={PAD_L - 6} x2={w - PAD_R + 6} y1={y0} y2={y0} data-link={linked ? `${i}.from ${i}.to` : undefined} />

        {#if ghosts !== "none" || still}
          <g class="reveal-ghosts" class:onion={ghosts === "hover" && !still}>
            {#each d.xs as x, n (n)}
              {#if n > 0 && n < d.xs.length - 1}
                {#if object === "dot"}
                  <circle class="ghost" cx={x} cy={y0} r={R * d.scaleOf(d.times[n])} opacity={0.2 + 0.5 * d.opacityOf(d.times[n])} />
                {:else}
                  {@const s = d.scaleOf(d.times[n])}
                  <rect class="ghost" x={x - R * s} y={y0 - R * s} width={2 * R * s} height={2 * R * s} rx="3" opacity={0.2 + 0.5 * d.opacityOf(d.times[n])} />
                {/if}
              {/if}
            {/each}
          </g>
        {/if}

        {#if chart}
          {@const yc = y0 + 26}
          <g class="reveal-ghosts" data-link={linked ? `${i}.easing ${i}.duration` : undefined}>
            <line class="grid" x1={PAD_L - 6} x2={w - PAD_R + 6} y1={yc} y2={yc} />
            {#each d.xs as x, n (n)}
              {#if n === 0 || n === d.xs.length - 1}
                <circle class="key-stroke" cx={x} cy={yc} r="5.5" />
              {:else}
                <line class="ghost" x1={x} x2={x} y1={yc - 5} y2={yc + 5} />
              {/if}
            {/each}
            {#each d.labels as l (l.n)}
              <text class="label" x={l.x} y={yc + 19} text-anchor="middle">{l.n}</text>
            {/each}
          </g>
        {/if}

        <g class="reveal-key">
          {#if object === "dot"}
            <circle class={d.row.tone === "blue" ? "ghost-fill" : "key"} cx={xNow} cy={y0} r={R * d.scaleOf(tNow)} opacity={d.opacityOf(tNow)} />
          {:else}
            {@const s = d.scaleOf(tNow)}
            <rect class={d.row.tone === "blue" ? "ghost-fill" : "key"} x={xNow - R * s} y={y0 - R * s} width={2 * R * s} height={2 * R * s} rx="3" opacity={d.opacityOf(tNow)} />
          {/if}
        </g>
      </g>
    {/each}
  </svg>
</div>

<style>
  .spacing { width: 100%; }
  svg { display: block; overflow: visible; }
</style>
