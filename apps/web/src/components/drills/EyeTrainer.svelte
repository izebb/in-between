<script lang="ts">
  /**
   * L6 · Eye trainer: ear training for the eyes. The drills are rows, as on the contents, in the order
   * of the chapters they follow: the chapter's number (filled in once it's read), what the drill
   * trains, and your last rounds. A row unfolds in place into the drill, with its calibration beside it.
   */
  import { onMount, tick } from "svelte";
  import { createLoop, type Loop } from "@inbetween/core";
  import { drills, drillOrder, drillNames, sessionMeasure } from "~/lib/drills";
  import { chapterByNumber, pad2, type DrillId } from "~/lib/curriculum";
  import { allSessions, chaptersRead, clearSessions, type DrillSession } from "~/lib/store";
  import type { Face, Numeral } from "~/lib/outline";
  import { play, collapse } from "~/motion/primitives";
  import { duration } from "~/motion/tokens";
  import OutlineNum from "~/components/ui/OutlineNum.svelte";
  import DrillRunner from "./DrillRunner.svelte";
  import Calibration from "./Calibration.svelte";

  /** Each drill's number, outlined by the page at build time. */
  let { numerals }: { numerals: Record<string, Record<Face, Numeral>> } = $props();

  let sessions = $state<DrillSession[]>([]);
  let read = $state<number[]>([]);
  let open = $state<DrillId | null>(null);
  /** Drawers still folding shut: they stay until they have. */
  let closing = $state<DrillId[]>([]);
  let loaded = $state(false);
  const folds = new Map<DrillId, HTMLElement>();
  let holding: Loop | null = null;

  async function refresh() {
    [sessions, read] = await Promise.all([allSessions(), chaptersRead()]);
    loaded = true;
  }
  onMount(() => {
    const q = new URLSearchParams(location.search).get("drill") as DrillId | null;
    if (q && drills[q]) open = q;
    // This island renders in the browser only, so a link to a drill (?drill=…, from the chapters)
    // arrives before its row exists: go there once the history has loaded and drawn.
    refresh().then(tick).then(() => {
      if (open) document.getElementById(`drill-${open}`)?.scrollIntoView({ block: "start" });
    });
  });

  const byDrill = $derived(
    Object.fromEntries(drillOrder.map((id) => [id, sessions.filter((s) => s.drill === id).sort((a, b) => a.at - b.at)])) as Record<DrillId, DrillSession[]>,
  );
  const played = $derived(drillOrder.filter((id) => byDrill[id].length).length);
  const isRead = (n: number) => n === 0 || read.includes(n);

  /** A tick per recent round, taller the better it went. */
  function ticks(id: DrillId) {
    const d = drills[id]!;
    return byDrill[id].slice(-8).map((s) => {
      const m = sessionMeasure(d.kind, s);
      return 3 + (Math.max(0, d.kind === "estimate" ? 100 - m : m) / 100) * 11;
    });
  }

  function summary(id: DrillId) {
    const d = drills[id]!;
    const mine = byDrill[id];
    if (!mine.length) return "not played yet";
    const last = Math.round(sessionMeasure(d.kind, mine[mine.length - 1]));
    return `${mine.length} round${mine.length === 1 ? "" : "s"} · ${d.kind === "estimate" ? `error ${last}%` : `${last}% right`}`;
  }

  /**
   * A drawer unfolds (its height and its opacity) on the scene token, since it travels a long way,
   * and folds on the quicker exit; either continues from wherever the other left it. Unfolded, it
   * lets go of the measured height, so a round that grows the drawer isn't clipped.
   */
  function unfold(el: HTMLElement, dir: "in" | "out") {
    el.style.overflow = "hidden";
    const anim = play(el, collapse(el, dir, "scene"));
    return (anim ? anim.finished : Promise.resolve()).then(() => {
      if (dir === "out") return;
      anim?.cancel();
      el.style.overflow = "";
    });
  }

  /** A drawer's fold: it unfolds as it's added, and stays to be folded away before it goes. */
  function fold(el: HTMLElement, id: DrillId) {
    folds.set(id, el);
    unfold(el, "in").catch(() => {});
    return { destroy: () => folds.get(id) === el && folds.delete(id) };
  }

  function shut(id: DrillId) {
    const el = folds.get(id);
    if (!el) return;
    closing = [...closing, id];
    unfold(el, "out")
      .then(() => (closing = closing.filter((x) => x !== id)))
      .catch(() => {}); // interrupted: it was opened again, and is unfolding
  }

  /** While a drawer above folds shut, keep the clicked row where it was clicked, frame by frame. */
  function hold(head: HTMLElement, top: number) {
    const scroller = head.closest<HTMLElement>("[data-scroller]");
    if (!scroller) return;
    holding?.stop();
    const until = performance.now() + duration.scene;
    holding = createLoop(() => {
      const moved = head.getBoundingClientRect().top - top;
      if (moved) scroller.scrollBy({ top: moved, behavior: "instant" });
      return performance.now() < until;
    });
  }

  function toggle(id: DrillId) {
    const head = document.getElementById(`head-${id}`)!;
    const top = head.getBoundingClientRect().top;
    const was = open;
    open = was === id ? null : id;
    if (was) shut(was);
    if (open && closing.includes(open)) {
      // Opened again while still folding shut: it unfolds from where it has got to.
      closing = closing.filter((x) => x !== open);
      unfold(folds.get(open)!, "in").catch(() => {});
    }
    const url = new URL(location.href);
    if (open) url.searchParams.set("drill", open);
    else url.searchParams.delete("drill");
    history.replaceState(history.state, "", url);
    hold(head, top);
  }

  async function reset() {
    if (!confirm("Clear every drill score and your calibration history? This can't be undone.")) return;
    await clearSessions();
    await refresh();
  }
</script>

<div class="trainer">
  <div class="list-head">
    <h2 class="smallcaps list-title">Drills</h2>
    <div class="tick-rule" aria-hidden="true"></div>
    {#if loaded}<span class="smallcaps count">{played} of {drillOrder.length} played</span>{/if}
  </div>

  <ol class="drills" role="list">
    {#each drillOrder as id (id)}
      {@const d = drills[id]}
      {@const ch = d ? chapterByNumber(d.unlocksAfter) : null}
      {@const isOpen = open === id}
      {@const inked = !!d && isRead(d.unlocksAfter)}
      <li class="item" class:open={isOpen} id="drill-{id}">
        <button
          type="button"
          id="head-{id}"
          class="row-head"
          class:pencil-hover={!!d}
          class:ph-held={isOpen}
          class:soon={!d}
          disabled={!d}
          aria-expanded={d ? isOpen : undefined}
          aria-controls={d ? `drawer-${id}` : undefined}
          onclick={() => toggle(id)}
        >
          {#if d}<svg class="ph-outline" aria-hidden="true"><rect x="0.5" y="0.5" width="100%" height="100%" pathLength="1" /></svg>{/if}
          <OutlineNum class="row-n ph-n {inked ? 'inked' : ''}" text={pad2(d?.unlocksAfter ?? 0)} n={numerals[id]} />
          <span class="row-text">
            <span class="row-title serif ph-title">{d?.name ?? drillNames[id]}</span>
            {#if d}<span class="row-sum">{d.trains}</span>{/if}
            <span class="visually-hidden">{!d ? "In preparation." : d.unlocksAfter === 0 ? "Open from the start." : inked ? "Chapter read." : "Chapter not read yet."}</span>
          </span>
          <span class="row-prog mono">
            {#if d && byDrill[id].length}
              <span class="ticks" aria-hidden="true">
                {#each ticks(id) as h, i (i)}<span class="tick" class:last={i === Math.min(8, byDrill[id].length) - 1} style:height="{h}px"></span>{/each}
              </span>
            {/if}
            {#if !d}in preparation{:else if loaded}{summary(id)}{/if}
          </span>
          <svg class="pm" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M4 12h16" /></svg>
        </button>

        {#if d && (isOpen || closing.includes(id))}
          <div class="fold" use:fold={id} inert={!isOpen}>
          <div class="drawer" id="drawer-{id}" role="region" aria-labelledby="head-{id}">
            <div class="play">
              <p class="builds">
                {#if ch}
                  Builds on <a href={`/chapters/${ch.slug}`}>{pad2(ch.number)} · {ch.title}</a>.{#if !inked}{" "}You haven't read it yet: read it first, or try anyway.{/if}
                {:else}
                  Open from the start: no chapter needed first.
                {/if}
              </p>
              <DrillRunner drill={id} mode="round" heading={false} onfinish={refresh} />
            </div>
            <section class="calib" aria-labelledby="calib-{id}">
              <h3 class="smallcaps" id="calib-{id}">Your eye, over time</h3>
              {#if byDrill[id].length}
                <p class="mono calib-sum">{summary(id)}</p>
                <Calibration def={d} sessions={byDrill[id]} />
              {:else if loaded}
                <p class="empty">No rounds yet. Your first round puts the first points here.</p>
              {/if}
            </section>
          </div>
          </div>
        {/if}
      </li>
    {/each}
  </ol>

  <div class="foot">
    <p class="legend mono">A filled-in number: you've read the chapter the drill builds on.</p>
    {#if sessions.length}<button class="btn ghost small" type="button" onclick={reset}>Clear history</button>{/if}
  </div>
</div>

<style>
  .trainer { display: flex; flex-direction: column; gap: 1.25rem; }
  .list-head { display: flex; align-items: baseline; gap: 1rem; }
  /* The ruler has no text, so its baseline is its bottom edge: the labels sit on its line. */
  .list-head .tick-rule { flex: 1; min-width: 0; }
  .list-title { color: var(--graphite-strong); line-height: 1; }
  .count { color: var(--graphite); line-height: 1; font-variant-numeric: tabular-nums; }

  /* The page doesn't anchor its scroll inside the list: while drawers fold, hold() keeps the clicked
     row still itself. */
  /* Rows are set apart by space, not rules. */
  .drills { display: flex; flex-direction: column; gap: 0.5rem; margin: 0; padding: 0; list-style: none; overflow-anchor: none; }
  /* An open row is one raised panel, the row and its drill together, bleeding a little past the
     list's edges. Its ground fades in while the drawer unfolds and out, quicker, while it folds. */
  .item {
    --bleed: 1rem;
    margin-inline: calc(-1 * var(--bleed));
    padding-inline: var(--bleed);
    border-radius: 8px;
    transition: background-color var(--dur-scene-exit) var(--ease-in);
  }
  .item.open { background-color: var(--paper-raised); transition: background-color var(--dur-scene) var(--ease-out); }

  /* A row as on the contents: the number, the words, then your rounds, and the + that turns to ×
     while it's open. */
  .row-head {
    display: grid;
    grid-template-columns: 3.5rem minmax(0, 1fr) 10rem 1.5rem;
    grid-template-areas: "n text prog pm";
    align-items: center;
    gap: 1rem;
    width: calc(100% + 1rem);
    margin-inline: -0.5rem;
    padding: 0.85rem 0.5rem;
    border-radius: 4px;
    background: transparent;
    color: var(--ink);
    text-align: left;
    transition: padding var(--dur-scene-exit) var(--ease-in);
  }
  /* Open, the row takes more room above and below, growing with the panel. */
  .item.open .row-head { padding-block: 1.5rem 1.25rem; transition: padding var(--dur-scene) var(--ease-out); }
  .row-head.soon { opacity: 0.45; cursor: default; }
  /* The number: a hairline outline, filled in once its chapter is read; inked in blue pencil on hover. */
  .row-head :global(.row-n) { grid-area: n; font-size: 2.25rem; color: var(--ph-n, var(--graphite)); --o-hair: 28; }
  .row-head :global(.row-n.inked) { color: var(--ph-n, var(--ink)); }
  .row-head :global(.row-n.inked .o-hair) { fill: currentColor; }
  .row-text { grid-area: text; display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
  .row-title { font-size: 1.4rem; line-height: 1.15; }
  .row-sum { font-size: var(--text-sm); color: var(--graphite-strong); line-height: 1.4; }
  .row-prog { grid-area: prog; display: flex; flex-direction: column; gap: 0.4rem; font-size: var(--text-xs); color: var(--graphite-strong); }
  .ticks { display: flex; align-items: flex-end; gap: 2px; height: 14px; }
  .tick { width: 3px; border-radius: 1px; background: color-mix(in srgb, var(--ink) 28%, transparent); }
  .tick.last { background: var(--ink); }
  .pm { grid-area: pm; width: 1.5rem; height: 1.5rem; fill: none; stroke: var(--graphite-strong); stroke-width: 1.5; stroke-linecap: round; transition: rotate var(--dur-base) var(--ease-inout); }
  .item.open .pm { rotate: 45deg; }
  /* Open, the panel marks the row: no pencil outline round its head, even on hover. */
  .item.open .ph-outline { display: none; }

  /* The fold is what unfolds; it holds the drawer's margins, so they fold with it. */
  .fold { display: flow-root; }
  /* The drill, opened under its row on the panel, lined up with the row's words. */
  .drawer {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 21.5rem;
    gap: 2rem;
    margin: 1.25rem 0 2.75rem 4.5rem;
  }
  .play { min-width: 0; }
  /* Room above Start, so it isn't pressed up against the fine print. */
  .play :global(.r-intro > .btn) { margin-top: 0.9rem; }
  .builds { font-size: var(--text-sm); color: var(--graphite-strong); margin-bottom: 1rem; }
  .calib { display: flex; flex-direction: column; gap: 0.6rem; min-width: 0; padding-left: 1.75rem; border-left: 1px solid var(--rule); }
  .calib h3 { color: var(--graphite-strong); }
  .calib-sum { font-size: var(--text-xs); color: var(--graphite-strong); }
  .empty { font-size: var(--text-sm); color: var(--graphite-strong); }

  .foot { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .legend { font-size: var(--text-xs); color: var(--graphite-strong); }

  /* Too narrow for the round and its calibration side by side: the calibration goes under it. */
  @media (max-width: 1100px) {
    .drawer { grid-template-columns: minmax(0, 1fr); }
    .calib { padding: 1rem 0 0; border-left: 0; border-top: 1px solid var(--rule); }
  }
  @media (max-width: 860px) {
    .drawer { margin-left: 0; }
  }
  /* One column: the number and the + stay level with the title, the rest stacks under it. */
  @media (max-width: 560px) {
    .row-head { grid-template-columns: 2.75rem minmax(0, 1fr) 1.5rem; grid-template-areas: "n text pm" "n prog pm"; row-gap: 0.5rem; align-items: start; }
    .item { --bleed: 0.75rem; }
    .row-head :global(.row-n) { font-size: 1.75rem; --o-hair: 36; }
    .row-title { font-size: 1.25rem; }
    .pm { margin-top: 0.1rem; }
  }
</style>
