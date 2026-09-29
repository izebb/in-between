<script lang="ts">
  /**
   * A spring's position over real time (not normalised): where it overshoots,
   * the envelope it decays inside, and the moment it settles.
   */
  import { spring as makeSpring, dampingRatio, type SpringParams } from "@inbetween/core";
  import { resize } from "~/lib/actions";

  export interface SpringLine {
    params: SpringParams;
    velocity?: number;
    label?: string;
    tone?: "red" | "blue";
  }
  interface Props {
    springs: SpringLine[];
    /** Playhead, ms. null = no cursor. */
    time?: number | null;
    height?: number;
    envelope?: boolean;
    settle?: boolean;
    /** Fixed time span in seconds; defaults to the slowest settle. */
    span?: number;
    index?: number;
    /** Numbers: time ticks, settle time, overshoot. Off before a chapter's FEEL beat. */
    readout?: boolean;
  }
  let { springs, time = null, height = 260, envelope = true, settle = true, span, index = 0, readout = true }: Props = $props();

  let w = $state(520);
  // The same id on the server and in the browser, so the hydrated clip path matches.
  const uid = $props.id();
  const M = { l: 34, r: 18, t: 18, b: 30 };
  const solved = $derived(springs.map((s) => ({ ...s, sp: makeSpring(s.params, { from: 0, to: 1, velocity: s.velocity ?? 0 }) })));
  const T = $derived(span ?? Math.max(0.3, ...solved.map((s) => s.sp.settleTime() * 1.15)));
  const yr = $derived.by(() => {
    let lo = 0;
    let hi = 1;
    for (const s of solved) {
      for (let i = 0; i <= 200; i++) {
        const y = s.sp.position((i / 200) * T);
        lo = Math.min(lo, y);
        hi = Math.max(hi, y);
      }
    }
    const pad = (hi - lo) * 0.08;
    return { lo: lo - pad, hi: hi + pad };
  });
  const pw = $derived(Math.max(80, w - M.l - M.r));
  const ph = $derived(height - M.t - M.b);
  const X = (t: number) => M.l + (t / T) * pw;
  const Y = (y: number) => M.t + (1 - (y - yr.lo) / (yr.hi - yr.lo)) * ph;
  const path = (f: (t: number) => number) => {
    let d = "";
    for (let i = 0; i <= 240; i++) {
      const t = (i / 240) * T;
      d += `${i ? "L" : "M"}${X(t).toFixed(2)},${Y(f(t)).toFixed(2)}`;
    }
    return d;
  };
  const main = $derived(solved[0]);
  const zeta = $derived(dampingRatio(main.params));
  const env = $derived.by(() => {
    if (!envelope || zeta >= 1) return null;
    const w0 = Math.sqrt(main.params.stiffness / main.params.mass);
    const k = zeta * w0;
    return {
      up: path((t) => 1 + Math.exp(-k * t)),
      down: path((t) => 1 - Math.exp(-k * t)),
    };
  });
  const ticks = $derived.by(() => {
    const step = T > 2 ? 0.5 : T > 1 ? 0.25 : 0.1;
    const out: number[] = [];
    for (let t = 0; t <= T + 1e-9; t += step) out.push(+t.toFixed(2));
    return out;
  });
  const overshoot = $derived.by(() => {
    let max = 0;
    let at = 0;
    for (let i = 0; i <= 400; i++) {
      const t = (i / 400) * T;
      const y = main.sp.position(t);
      if (y > max) {
        max = y;
        at = t;
      }
    }
    return { amount: max - 1, at };
  });
</script>

<div class="springgraph" use:resize={(width) => (w = width)}>
  <svg width={w} {height} viewBox={`0 0 ${w} ${height}`} role="img" aria-label={`Spring position over time. Damping ratio ${zeta.toFixed(2)}. Settles in ${Math.round(main.sp.settleTime() * 1000)} milliseconds.`}>
    {#each ticks as t (t)}
      <line class="grid" x1={X(t)} x2={X(t)} y1={Y(yr.lo)} y2={Y(yr.hi)} />
      {#if readout}<text class="label" x={X(t)} y={height - 12} text-anchor="middle">{t < 1 ? `${Math.round(t * 1000)}ms` : `${t}s`}</text>{/if}
    {/each}
    <line class="grid" x1={X(0)} x2={X(T)} y1={Y(1)} y2={Y(1)} />
    <line class="ax reveal-axes" pathLength="1" x1={X(0)} x2={X(0)} y1={Y(yr.hi)} y2={Y(yr.lo)} />
    <line class="ax reveal-axes" pathLength="1" x1={X(0)} x2={X(T)} y1={Y(0)} y2={Y(0)} />
    <text class="label" x={X(0) - 6} y={Y(0) + 3} text-anchor="end">0</text>
    <text class="label" x={X(0) - 6} y={Y(1) + 3} text-anchor="end">1</text>
    <text class="label upper" x={X(T)} y={Y(1) - 6} text-anchor="end">target</text>

    <defs><clipPath id={`sg-clip-${uid}`}><rect x={M.l} y={M.t - 4} width={pw} height={ph + 8} /></clipPath></defs>
    {#if env}
      <g class="reveal-ghosts" clip-path={`url(#sg-clip-${uid})`}>
        <path class="path dashed" d={env.up} opacity="0.6" />
        <path class="path dashed" d={env.down} opacity="0.6" />
      </g>
    {/if}

    {#each solved.slice(1) as s, i (i)}
      <path class="path reveal-ghosts" d={path((t) => s.sp.position(t))} />
    {/each}
    <path class="ink curve" d={path((t) => main.sp.position(t))} data-link={`${index}.easing`} />

    {#if settle && readout}
      {@const st = main.sp.settleTime()}
      <g class="reveal-ghosts">
        <line class="grid settle" x1={X(st)} x2={X(st)} y1={Y(yr.lo)} y2={Y(yr.hi)} />
        <text class="label" x={X(st) + (st / T > 0.6 ? -5 : 5)} y={Y(yr.lo) - 6} text-anchor={st / T > 0.6 ? "end" : "start"}>settles · {Math.round(st * 1000)}ms</text>
      </g>
      {#if overshoot.amount > 0.005}
        <g class="reveal-ghosts">
          <circle class="ghost-fill" cx={X(overshoot.at)} cy={Y(1 + overshoot.amount)} r="2.5" />
          <text class="label" x={X(overshoot.at) + (overshoot.at / T > 0.6 ? -6 : 6)} y={Y(1 + overshoot.amount) - 5} text-anchor={overshoot.at / T > 0.6 ? "end" : "start"}>overshoot {Math.round(overshoot.amount * 100)}%</text>
        </g>
      {/if}
    {/if}

    {#if time != null}
      {@const t = Math.min(T, time / 1000)}
      <g class="reveal-key">
        <line class="key-stroke cursor" x1={X(t)} x2={X(t)} y1={Y(yr.lo)} y2={Y(yr.hi)} />
        <circle class="key" cx={X(t)} cy={Y(main.sp.position(t))} r="4.5" />
        {#each solved.slice(1) as s, i (i)}<circle class="ghost-fill" cx={X(t)} cy={Y(s.sp.position(t))} r="3.5" />{/each}
      </g>
    {/if}
  </svg>
</div>

<style>
  .springgraph { width: 100%; }
  svg { display: block; overflow: visible; }
  .curve { stroke-width: 2; }
  .cursor { stroke-width: 1; opacity: 0.55; }
  .settle { stroke-dasharray: 2 3; stroke: var(--graphite); }
</style>
