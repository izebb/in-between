<script lang="ts">
  /**
   * The exposure sheet: one row per track, time running across in frames.
   * A bar spans a move's delay → end; drag it to change the delay, drag its right edge to change
   * the duration. Inside each bar, its easing is drawn as a curve. The red line is now.
   */
  import { resolveMove, type Move } from "@inbetween/core";
  import { resize } from "~/lib/actions";

  interface Props {
    moves: Move[];
    time: number;
    fps?: number;
    selected?: number;
    editable?: boolean;
    /** Total span shown, ms (defaults to the scene end + a margin). */
    span?: number;
    onchange?: (i: number, patch: Partial<Move>) => void;
    onselect?: (i: number) => void;
    onscrub?: (ms: number) => void;
  }
  let { moves, time, fps = 60, selected = $bindable(0), editable = true, span, onchange, onselect, onscrub }: Props = $props();

  let w = $state(600);
  const LABEL = 88;
  const ROW = 30;
  const HEAD = 22;
  const resolved = $derived(moves.map((m) => resolveMove(m)));
  const total = $derived(span ?? Math.max(300, ...resolved.map((r) => r.end)) * 1.12);
  const pw = $derived(Math.max(100, w - LABEL - 8));
  const X = (ms: number) => LABEL + (ms / total) * pw;
  const frameMs = $derived(1000 / fps);
  const frames = $derived(Math.ceil(total / frameMs));
  const every = $derived(frames > 120 ? 10 : 5);
  const H = $derived(HEAD + moves.length * ROW + 6);

  function curve(i: number) {
    const r = resolved[i];
    const x0 = X(r.delay);
    const x1 = X(r.end);
    const top = HEAD + i * ROW + 6;
    const h = ROW - 12;
    let lo = 0;
    let hi = 1;
    const ys: number[] = [];
    for (let k = 0; k <= 40; k++) {
      const p = r.progress(r.delay + (k / 40) * r.duration);
      ys.push(p);
      lo = Math.min(lo, p);
      hi = Math.max(hi, p);
    }
    return ys.map((p, k) => `${k ? "L" : "M"}${(x0 + ((x1 - x0) * k) / 40).toFixed(1)},${(top + h - ((p - lo) / (hi - lo || 1)) * h).toFixed(1)}`).join("");
  }

  let drag: { i: number; mode: "move" | "end"; x0: number; delay: number; duration: number } | null = null;
  function down(i: number, mode: "move" | "end") {
    return (e: PointerEvent) => {
      selected = i;
      onselect?.(i);
      if (!editable) return;
      e.stopPropagation();
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
      drag = { i, mode, x0: e.clientX, delay: moves[i].delay, duration: moves[i].duration };
    };
  }
  function move(e: PointerEvent) {
    if (scrubbing && !drag) return scrubAt(e);
    if (!drag) return;
    const dms = ((e.clientX - drag.x0) / pw) * total;
    const snap = (v: number) => Math.round(v / frameMs) * frameMs;
    if (drag.mode === "move") onchange?.(drag.i, { delay: Math.max(0, Math.round(snap(drag.delay + dms))) });
    else if (moves[drag.i].easing.type !== "spring") onchange?.(drag.i, { duration: Math.max(frameMs, Math.round(snap(drag.duration + dms))) });
  }
  function up() {
    drag = null;
    scrubbing = false;
  }
  let scrubbing = false;
  function scrubAt(e: PointerEvent) {
    const r = (e.currentTarget as Element).getBoundingClientRect();
    const ms = ((e.clientX - r.left - LABEL) / pw) * total;
    if (ms >= 0) onscrub?.(Math.min(total, ms));
  }
  function scrub(e: PointerEvent) {
    if (drag) return;
    scrubbing = true;
    (e.currentTarget as Element).setPointerCapture?.(e.pointerId);
    scrubAt(e);
  }
  function key(i: number) {
    return (e: KeyboardEvent) => {
      if (!editable) return;
      const step = e.shiftKey ? frameMs * 5 : frameMs;
      if (e.key === "ArrowRight") onchange?.(i, { delay: Math.round(moves[i].delay + step) });
      else if (e.key === "ArrowLeft") onchange?.(i, { delay: Math.max(0, Math.round(moves[i].delay - step)) });
      else return;
      e.preventDefault();
    };
  }
</script>

<div class="xsheet" use:resize={(width) => (w = width)}>
  <svg width={w} height={H} viewBox={`0 0 ${w} ${H}`} role="group" aria-label="Exposure sheet" onpointermove={move} onpointerup={up} onpointerdown={scrub}>
    {#each Array(frames + 1) as _, f (f)}
      {#if f % every === 0}
        <line class="grid" x1={X(f * frameMs)} x2={X(f * frameMs)} y1={HEAD - 4} y2={H} />
        <text class="label" x={X(f * frameMs)} y={HEAD - 8} text-anchor="middle">{f}</text>
      {:else if frames <= 90}
        <line class="grid faint" x1={X(f * frameMs)} x2={X(f * frameMs)} y1={HEAD} y2={H} />
      {/if}
    {/each}
    <text class="label upper" x="0" y={HEAD - 8}>frame</text>
    {#each moves as m, i (i)}
      {@const r = resolved[i]}
      {@const y = HEAD + i * ROW}
      <g class="track" class:selected={selected === i} class:even={i % 2 === 1} data-link={`${i}`}>
        <rect class="row-bg" x="0" {y} width={w} height={ROW} />
        <text class="label" x="0" y={y + ROW / 2 + 3}>{m.target} · {m.property}</text>
        <g role="button" tabindex={editable ? 0 : -1} aria-label={`${m.target} ${m.property}: delay ${m.delay}ms, duration ${Math.round(r.duration)}ms`} onpointerdown={down(i, "move")} onkeydown={key(i)} data-link={`${i}.delay`}>
          <rect class="bar" x={X(r.delay)} y={y + 5} width={Math.max(2, X(r.end) - X(r.delay))} height={ROW - 10} rx="3" />
          <path class="bar-curve" d={curve(i)} />
          <circle class="key-stroke" cx={X(r.delay)} cy={y + ROW / 2} r="3.5" />
        </g>
        {#if m.easing.type !== "spring"}
          <rect class="handle" x={X(r.end) - 4} y={y + 5} width="8" height={ROW - 10} onpointerdown={down(i, "end")} data-link={`${i}.duration`} role="presentation" />
        {/if}
        <circle class="key-stroke" cx={X(r.end)} cy={y + ROW / 2} r="3.5" />
      </g>
    {/each}
    <line class="now" x1={X(Math.min(time, total))} x2={X(Math.min(time, total))} y1={HEAD - 4} y2={H} />
  </svg>
</div>

<style>
  .xsheet { width: 100%; user-select: none; }
  svg { display: block; overflow: visible; touch-action: none; }
  .faint { opacity: 0.45; }
  .row-bg { fill: transparent; }
  .track.even .row-bg { fill: color-mix(in srgb, var(--ink) 2%, transparent); }
  .track.selected .row-bg { fill: color-mix(in srgb, var(--blue-pencil) 7%, transparent); }
  .bar { fill: color-mix(in srgb, var(--ink) 7%, transparent); stroke: var(--graphite); stroke-width: 1; cursor: grab; }
  .track.selected .bar { stroke: var(--ink); }
  .bar-curve { fill: none; stroke: var(--blue-pencil); stroke-width: 1.25; pointer-events: none; }
  .handle { fill: transparent; cursor: ew-resize; }
  .handle:hover { fill: color-mix(in srgb, var(--ink) 12%, transparent); }
  .now { stroke: var(--red-pencil); stroke-width: 1.5; pointer-events: none; }
  g[role="button"]:focus-visible .bar { stroke: var(--blue-pencil); stroke-width: 2; }
  g[role="button"] { outline: none; }
</style>
