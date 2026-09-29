<script lang="ts">
  /**
   * Several elements, each driven by its own tracks, at one moment in time.
   * The selected element's path is drawn as ghosts (blue): where it was and where it will be.
   */
  import { resolveMove, frameTimes, type Move } from "@inbetween/core";

  interface Props {
    moves: Move[];
    time: number;
    layout?: "list" | "boxes" | "cards";
    selected?: number | null;
    fps?: number;
    height?: number;
  }
  let { moves, time, layout = "list", selected = null, fps = 60, height = 240 }: Props = $props();

  const targets = $derived([...new Set(moves.map((m) => m.target))]);
  const resolved = $derived(moves.map((m) => ({ m, r: resolveMove(m) })));

  interface Pose { x: number; y: number; scale: number; opacity: number; rotate: number }
  function pose(target: string, t: number): Pose {
    const p: Pose = { x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 };
    for (const { m, r } of resolved) if (m.target === target) p[m.property] = r.value(t);
    return p;
  }
  const style = (p: Pose) => `transform: translate(${p.x}px, ${p.y}px) scale(${p.scale}) rotate(${p.rotate}deg); opacity: ${Math.max(0, Math.min(1, p.opacity))}`;

  const ghostTarget = $derived(selected != null && moves[selected] ? moves[selected].target : null);
  const ghosts = $derived.by(() => {
    if (!ghostTarget || selected == null) return [];
    const r = resolved[selected].r;
    return frameTimes(r.end, fps).filter((_, i) => i % 3 === 0).map((t) => pose(ghostTarget, t));
  });
</script>

<div class="choreo layout-{layout}" style={`min-height:${height}px`}>
  {#each targets as t, i (t)}
    <div class="slot" data-link={moves.map((m, k) => (m.target === t ? String(k) : "")).filter(Boolean).join(" ")}>
      {#if t === ghostTarget}
        {#each ghosts as g, k (k)}<div class="el ghost-el" style={style({ ...g, opacity: 1 })}></div>{/each}
      {/if}
      <div class="el" class:active={t === ghostTarget} style={style(pose(t, time))}>
        {#if layout === "list"}<span class="av"></span><span class="ln" style={`width:${[64, 52, 72, 58, 68, 60][i % 6]}%`}></span>{/if}
        <span class="tag mono">{t}</span>
      </div>
    </div>
  {/each}
</div>

<style>
  .choreo { position: relative; overflow: hidden; padding: 1.25rem 1.5rem; display: flex; flex-direction: column; justify-content: center; gap: 10px; }
  .layout-boxes { flex-direction: row; flex-wrap: wrap; align-items: center; justify-content: flex-start; gap: 18px; }
  .layout-cards { display: grid; grid-template-columns: repeat(3, 1fr); align-content: center; }
  .slot { position: relative; }
  .el {
    position: relative;
    display: flex; align-items: center; gap: 10px;
    height: 34px; padding: 0 10px;
    border-radius: 6px;
    background: var(--paper-raised);
    border: 1px solid var(--rule);
    box-shadow: 0 4px 14px -10px rgb(0 0 0 / 0.35);
    will-change: transform, opacity;
  }
  .layout-list .el { max-width: 420px; }
  .layout-boxes .el { width: 46px; height: 46px; padding: 0; justify-content: center; background: var(--red-pencil); border-color: transparent; }
  .layout-cards .el { height: 64px; }
  .el.active { border-color: var(--ink); }
  .ghost-el { position: absolute; inset: 0; background: transparent !important; border: 1px solid var(--blue-pencil) !important; box-shadow: none; opacity: 0.55 !important; pointer-events: none; }
  .av { width: 16px; height: 16px; border-radius: 50%; background: color-mix(in srgb, var(--ink) 16%, transparent); flex: none; }
  .ln { height: 7px; border-radius: 4px; background: color-mix(in srgb, var(--ink) 14%, transparent); }
  .tag { margin-left: auto; font-size: 10px; color: var(--graphite-strong); white-space: nowrap; }
  .layout-boxes .tag { margin: 0; color: var(--paper); }
</style>
