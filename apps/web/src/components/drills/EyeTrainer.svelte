<script lang="ts">
  /** L6 · Eye trainer: ear training for the eyes. Short scored rounds and a calibration graph. */
  import { onMount } from "svelte";
  import { drills, drillOrder, drillNames } from "~/lib/drills";
  import { chapterByNumber, pad2, type DrillId } from "~/lib/curriculum";
  import { allSessions, chaptersRead, clearSessions, type DrillSession } from "~/lib/store";
  import DrillRunner from "./DrillRunner.svelte";
  import Calibration from "./Calibration.svelte";

  let sessions = $state<DrillSession[]>([]);
  let read = $state<number[]>([]);
  let active = $state<DrillId | null>(null);
  let loaded = $state(false);

  async function refresh() {
    [sessions, read] = await Promise.all([allSessions(), chaptersRead()]);
    loaded = true;
  }
  onMount(() => {
    refresh();
    const q = new URLSearchParams(location.search).get("drill") as DrillId | null;
    if (q && drills[q]) active = q;
  });

  const stats = (id: DrillId) => {
    const s = sessions.filter((x) => x.drill === id);
    return { count: s.length, best: s.reduce((m, x) => Math.max(m, x.score), 0) };
  };
  const unlocked = (n: number) => n === 0 || read.includes(n);
  const withData = $derived(drillOrder.filter((id) => drills[id] && sessions.some((s) => s.drill === id)));

  function choose(id: DrillId) {
    active = id;
    const url = new URL(location.href);
    url.searchParams.set("drill", id);
    history.replaceState(history.state, "", url);
    document.getElementById("bench")?.scrollIntoView({ block: "start" });
  }

  async function reset() {
    if (!confirm("Clear every drill score and your calibration history? This can't be undone.")) return;
    await clearSessions();
    await refresh();
  }
</script>

<div class="trainer">
  <ol class="drill-list" role="list">
    {#each drillOrder as id (id)}
      {@const d = drills[id]}
      {@const ch = d ? chapterByNumber(d.unlocksAfter) : null}
      {@const st = stats(id)}
      <li>
        <button type="button" class="drill" class:active={active === id} disabled={!d} onclick={() => choose(id)}>
          <span class="smallcaps top">
            {#if !d}In preparation{:else if unlocked(d.unlocksAfter)}Unlocked{:else}After ch. {pad2(d.unlocksAfter)}{/if}
          </span>
          <span class="serif name">{d?.name ?? drillNames[id]}</span>
          {#if d}<span class="trains">{d.trains}</span>{/if}
          <span class="meta mono">
            {#if st.count}{st.count} round{st.count === 1 ? "" : "s"} · best {st.best}{:else if d && ch && !unlocked(d.unlocksAfter)}read <a href={`/chapters/${ch.slug}`} onclick={(e) => e.stopPropagation()}>{ch.title}</a> first, or try anyway{:else if d}not played yet{/if}
          </span>
        </button>
      </li>
    {/each}
  </ol>

  <section id="bench" class="bench" aria-live="polite">
    {#if active && drills[active]}
      {#key active}
        <DrillRunner drill={active} mode="round" onfinish={refresh} />
      {/key}
    {:else}
      <p class="pick serif">Pick a drill. A round lasts about a minute.</p>
    {/if}
  </section>

  <section id="calibration" class="calib">
    <div class="calib-head">
      <h2>Calibration</h2>
      <p>Your estimates against the truth. As your eye trains, the points close in on the diagonal and the error line falls.</p>
    </div>
    {#if loaded && withData.length === 0}
      <p class="empty">Nothing yet. Play a round of <em>Guess the duration</em> and your first points will land here.</p>
    {/if}
    {#each withData as id (id)}
      <div class="calib-item">
        <span class="smallcaps">{drills[id]!.name} · {sessions.filter((s) => s.drill === id).length} rounds</span>
        <Calibration def={drills[id]!} sessions={sessions.filter((s) => s.drill === id)} />
      </div>
    {/each}
    {#if sessions.length}<button class="btn ghost small clear" type="button" onclick={reset}>Clear history</button>{/if}
  </section>
</div>

<style>
  .trainer { display: flex; flex-direction: column; gap: 2rem; }
  .drill-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 250px), 1fr)); border-top: 1px solid var(--rule); border-left: 1px solid var(--rule); margin: 0; padding: 0; }
  .drill { width: 100%; height: 100%; text-align: left; display: flex; flex-direction: column; gap: 0.3rem; padding: 0.9rem 1rem 1rem; border-right: 1px solid var(--rule); border-bottom: 1px solid var(--rule); background: var(--paper); color: var(--ink); transition: background-color var(--dur-quick) var(--ease-out); min-height: 8.5rem; }
  .drill:hover:not(:disabled) { background: var(--paper-raised); }
  .drill.active { background: var(--paper-raised); box-shadow: inset 0 -2px 0 var(--ink); }
  .drill:disabled { opacity: 0.5; cursor: default; }
  .top { color: var(--graphite-strong); }
  .name { font-size: 1.35rem; line-height: 1.1; }
  .trains { font-size: var(--text-sm); color: var(--graphite-strong); }
  .meta { margin-top: auto; font-size: var(--text-xs); color: var(--graphite-strong); }
  .bench { border: 1px solid var(--rule); border-radius: 8px; padding: clamp(1rem, 3vw, 1.75rem); background: var(--plate-bg); scroll-margin-top: 1rem; }
  .pick { font-size: 1.5rem; color: var(--graphite-strong); }
  .calib { display: flex; flex-direction: column; gap: 1.25rem; }
  .calib-head p { color: var(--graphite-strong); max-width: 60ch; margin-top: 0.3rem; }
  .calib-item { display: flex; flex-direction: column; gap: 0.5rem; border-top: 1px solid var(--rule); padding-top: 1rem; }
  .calib-item .smallcaps { color: var(--graphite-strong); }
  .empty { color: var(--graphite-strong); }
  .clear { align-self: flex-start; }
</style>
