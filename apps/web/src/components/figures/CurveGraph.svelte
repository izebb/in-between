<script lang="ts">
  /**
   * A timing curve: progress (up) against time (across). For cubic-béziers, the two
   * blue handles are the velocity at the start and at the end. Drag them.
   */
  import { easingFn, cubicBezier, type EasingSpec } from "@inbetween/core";
  import { resize } from "~/lib/actions";

  interface Props {
    spec: EasingSpec;
    compare?: EasingSpec | null;
    /** Current time as a fraction 0..1 (null = no cursor). */
    progress?: number | null;
    editable?: boolean;
    /** Scene index for link paths. */
    index?: number;
    height?: number;
    label?: string;
    /** Horizontal axis label, e.g. "scroll →". */
    xLabel?: string;
    onedit?: () => void;
  }
  let { spec = $bindable(), compare = null, progress = null, editable = true, index = 0, height = 260, label = "position", xLabel = "time →", onedit }: Props = $props();

  let w = $state(300);
  const M = { l: 34, r: 16, t: 16, b: 28 };

  const fnOf = (s: EasingSpec) => easingFn(s).ease;
  const ease = $derived(fnOf(spec));
  const easeB = $derived(compare ? fnOf(compare) : null);

  const yRange = $derived.by(() => {
    let lo = 0;
    let hi = 1;
    const scan = (f: (x: number) => number) => {
      for (let i = 0; i <= 100; i++) {
        const y = f(i / 100);
        lo = Math.min(lo, y);
        hi = Math.max(hi, y);
      }
    };
    scan(ease);
    if (easeB) scan(easeB);
    if (spec.type === "cubic") {
      lo = Math.min(lo, spec.y1, spec.y2);
      hi = Math.max(hi, spec.y1, spec.y2);
    }
    const pad = (hi - lo) * 0.06;
    return { lo: lo - pad, hi: hi + pad };
  });

  const pw = $derived(Math.max(60, w - M.l - M.r));
  const ph = $derived(height - M.t - M.b);
  const X = (x: number) => M.l + x * pw;
  const Y = (y: number) => M.t + (1 - (y - yRange.lo) / (yRange.hi - yRange.lo)) * ph;
  const invX = (px: number) => (px - M.l) / pw;
  const invY = (py: number) => yRange.lo + (1 - (py - M.t) / ph) * (yRange.hi - yRange.lo);

  const pathOf = (f: (x: number) => number) => {
    let d = "";
    const n = 120;
    for (let i = 0; i <= n; i++) {
      const x = i / n;
      d += `${i ? "L" : "M"}${X(x).toFixed(2)},${Y(f(x)).toFixed(2)}`;
    }
    return d;
  };
  const curve = $derived(pathOf(ease));
  const curveB = $derived(easeB ? pathOf(easeB) : "");

  let svg: SVGSVGElement;
  let drag: 1 | 2 | null = $state(null);

  function down(which: 1 | 2) {
    return (e: PointerEvent) => {
      if (!editable || spec.type !== "cubic") return;
      e.preventDefault();
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      drag = which;
    };
  }
  function move(e: PointerEvent) {
    if (!drag || spec.type !== "cubic") return;
    const r = svg.getBoundingClientRect();
    const snap = e.shiftKey ? 0.05 : 0.01;
    const q = (v: number) => Math.round(v / snap) * snap;
    const x = Math.min(1, Math.max(0, q(invX(e.clientX - r.left))));
    const y = Math.min(2.5, Math.max(-1.5, q(invY(e.clientY - r.top))));
    if (drag === 1) {
      spec.x1 = +x.toFixed(3);
      spec.y1 = +y.toFixed(3);
    } else {
      spec.x2 = +x.toFixed(3);
      spec.y2 = +y.toFixed(3);
    }
    onedit?.();
  }
  function up() {
    drag = null;
  }
  function keyNudge(which: 1 | 2) {
    return (e: KeyboardEvent) => {
      if (spec.type !== "cubic") return;
      const d = e.shiftKey ? 0.05 : 0.01;
      const kx = which === 1 ? "x1" : "x2";
      const ky = which === 1 ? "y1" : "y2";
      if (e.key === "ArrowLeft") spec[kx] = +Math.max(0, spec[kx] - d).toFixed(3);
      else if (e.key === "ArrowRight") spec[kx] = +Math.min(1, spec[kx] + d).toFixed(3);
      else if (e.key === "ArrowUp") spec[ky] = +(spec[ky] + d).toFixed(3);
      else if (e.key === "ArrowDown") spec[ky] = +(spec[ky] - d).toFixed(3);
      else return;
      e.preventDefault();
      onedit?.();
    };
  }
</script>

<div class="curve" use:resize={(width) => (w = width)}>
  <svg bind:this={svg} width={w} {height} viewBox={`0 0 ${w} ${height}`} onpointermove={move} onpointerup={up} role="img" aria-label={`${label} over time`}>
    <!-- grid and axes -->
    <line class="grid" x1={X(0)} x2={X(1)} y1={Y(1)} y2={Y(1)} />
    <line class="grid" x1={X(1)} x2={X(1)} y1={Y(yRange.lo)} y2={Y(yRange.hi)} />
    <line class="grid" x1={X(0.5)} x2={X(0.5)} y1={Y(yRange.lo)} y2={Y(yRange.hi)} stroke-dasharray="2 4" />
    <line class="ax reveal-axes" pathLength="1" x1={X(0)} x2={X(0)} y1={Y(yRange.hi)} y2={Y(yRange.lo)} />
    <line class="ax reveal-axes" pathLength="1" x1={X(0)} x2={X(1)} y1={Y(0)} y2={Y(0)} />
    <text class="label" x={X(0) - 6} y={Y(0) + 3} text-anchor="end">0</text>
    <text class="label" x={X(0) - 6} y={Y(1) + 3} text-anchor="end">1</text>
    <text class="label upper" x={X(1)} y={height - 6} text-anchor="end">{xLabel}</text>
    <text class="label upper" x={X(0) + 6} y={M.t + 2}>{label}</text>

    <!-- linear reference -->
    <line class="grid" x1={X(0)} y1={Y(0)} x2={X(1)} y2={Y(1)} stroke-dasharray="1 4" />

    {#if curveB}
      <path class="path dashed reveal-ghosts" d={curveB} />
    {/if}

    {#if spec.type === "cubic"}
      <g class="reveal-ghosts handles">
        <line class="path" x1={X(0)} y1={Y(0)} x2={X(spec.x1)} y2={Y(spec.y1)} />
        <line class="path" x1={X(1)} y1={Y(1)} x2={X(spec.x2)} y2={Y(spec.y2)} />
      </g>
    {/if}

    <path class="ink curve-path" d={curve} data-link={`${index}.easing`} />

    {#if spec.type === "cubic"}
      {#each [1, 2] as which (which)}
        {@const hx = which === 1 ? spec.x1 : spec.x2}
        {@const hy = which === 1 ? spec.y1 : spec.y2}
        <g
          class="handle"
          class:dragging={drag === which}
          role="slider"
          tabindex={editable ? 0 : -1}
          aria-label={`Handle ${which}: ${hx}, ${hy}`}
          aria-valuenow={hy}
          data-link={`${index}.easing.x${which} ${index}.easing.y${which}`}
          onpointerdown={down(which as 1 | 2)}
          onkeydown={keyNudge(which as 1 | 2)}
        >
          <circle cx={X(hx)} cy={Y(hy)} r="14" fill="transparent" />
          <circle class="knob" cx={X(hx)} cy={Y(hy)} r="5" />
        </g>
      {/each}
    {/if}

    {#if progress != null}
      {@const p = Math.max(0, Math.min(1, progress))}
      <g class="reveal-key">
        <line class="key-stroke cursor" x1={X(p)} x2={X(p)} y1={Y(yRange.lo)} y2={Y(yRange.hi)} />
        <circle class="key" cx={X(p)} cy={Y(ease(p))} r="4.5" />
        {#if easeB}<circle class="ghost-fill" cx={X(p)} cy={Y(easeB(p))} r="3.5" />{/if}
      </g>
    {/if}
  </svg>
</div>

<style>
  .curve { width: 100%; }
  svg { display: block; overflow: visible; touch-action: none; }
  .curve-path { stroke-width: 2; }
  .cursor { stroke-width: 1; opacity: 0.55; }
  .handle { cursor: grab; }
  .handle.dragging { cursor: grabbing; }
  .handle .knob { fill: var(--paper); stroke: var(--blue-pencil); stroke-width: 1.5; transition: r var(--dur-instant) var(--ease-out); }
  .handle:hover .knob, .handle.dragging .knob, .handle:focus-visible .knob { fill: var(--blue-pencil); }
  .handle:focus-visible { outline: none; }
</style>
