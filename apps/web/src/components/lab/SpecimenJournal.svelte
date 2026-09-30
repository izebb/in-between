<script lang="ts">
  /**
   * L8 · Specimen journal: every lab state you saved, with the words you used for it.
   * Over time the words gather numbers: what *you* mean by "snappy" or "heavy".
   */
  import { onMount } from "svelte";
  import { resolveMove, type Move, dampingRatio } from "@inbetween/core";
  import { allSpecimens, deleteSpecimen, saveSpecimen, uid, type JournalEntry } from "~/lib/store";
  import { instrumentById, type InstrumentId } from "~/lib/curriculum";
  import { labUrl } from "~/lib/labstate";
  import { toMove } from "~/lib/spec";
  import SpacingTrack from "../figures/SpacingTrack.svelte";

  let entries = $state<JournalEntry[]>([]);
  let loaded = $state(false);
  let filter = $state<string | null>(null);

  async function refresh() {
    entries = await allSpecimens();
    loaded = true;
  }
  onMount(() => {
    refresh();
    addEventListener("ib:journal", refresh);
    return () => removeEventListener("ib:journal", refresh);
  });

  const firstMove = (e: JournalEntry): Move | null => {
    const s = e.state as { scene?: { moves?: Move[] } } | null;
    return s?.scene?.moves?.[0] ?? null;
  };

  const vocabulary = $derived.by(() => {
    const map = new Map<string, { count: number; durations: number[]; kinds: Record<string, number>; zetas: number[] }>();
    for (const e of entries) {
      const m = firstMove(e);
      for (const w of e.words) {
        const v = map.get(w) ?? { count: 0, durations: [], kinds: {}, zetas: [] };
        v.count++;
        if (m) {
          v.durations.push(resolveMove(m).duration);
          v.kinds[m.easing.type] = (v.kinds[m.easing.type] ?? 0) + 1;
          if (m.easing.type === "spring") v.zetas.push(dampingRatio(m.easing));
        }
        map.set(w, v);
      }
    }
    return [...map.entries()]
      .map(([word, v]) => {
        const d = [...v.durations].sort((a, b) => a - b);
        const median = d.length ? d[Math.floor(d.length / 2)] : null;
        const kind = Object.entries(v.kinds).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
        const zeta = v.zetas.length ? v.zetas.reduce((a, b) => a + b, 0) / v.zetas.length : null;
        return { word, count: v.count, median, kind, zeta };
      })
      .sort((a, b) => b.count - a.count);
  });

  const shown = $derived(filter ? entries.filter((e) => e.words.includes(filter!)) : entries);

  async function seed() {
    const mk = (words: string[], easing: string, duration: number, instrument: InstrumentId = "curve-bench") =>
      saveSpecimen({ id: uid(), at: Date.now(), instrument, words, state: { scene: { title: words.join(", "), moves: [toMove({ easing, duration, to: 320 })] } } });
    await mk(["snappy", "confident"], "cubic-bezier(.2,.8,.2,1)", 180);
    await mk(["heavy", "deliberate"], "cubic-bezier(.7,0,.3,1)", 620);
    await mk(["floaty"], "ease-in-out", 900);
    await mk(["bouncy", "playful"], "spring(response .45 bounce .45)", 0, "spring-bench");
    await refresh();
  }

  const fmtDate = (t: number) => new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short" });
</script>

<div class="journal">
  <section class="vocab" aria-labelledby="vocab-h">
    <div class="head">
      <h2 id="vocab-h">Your motion vocabulary</h2>
      <p>Each word, and what you meant by it in numbers: typical duration, curve, and ζ (damping) for springs. Click a word to see its specimens.</p>
    </div>
    {#if loaded && vocabulary.length === 0}
      <div class="empty">
        <p>No words yet. Every instrument has <b>Save to Journal</b>: tune something until it feels right, save it, and name the feeling.</p>
        <button class="btn small" type="button" onclick={seed}>Add four examples</button>
      </div>
    {:else}
      <ul class="words" role="list">
        {#each vocabulary as v (v.word)}
          <li>
            <button type="button" class="word" aria-pressed={filter === v.word} onclick={() => (filter = filter === v.word ? null : v.word)}>
              <span class="serif w">{v.word}</span>
              <span class="mono meta">{v.count}× {v.median != null ? `· ~${Math.round(v.median)}ms` : ""} {v.kind ? `· ${v.kind}` : ""} {v.zeta != null ? `· ζ ${v.zeta.toFixed(2)}` : ""}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  {#if !loaded || vocabulary.length > 0}
  <section class="list" aria-labelledby="spec-h">
    <div class="head">
      <h2 id="spec-h">Specimens {filter ? `· “${filter}”` : ""}</h2>
      {#if filter}<button class="btn ghost small" type="button" onclick={() => (filter = null)}>Show all</button>{/if}
    </div>
    <div class="grid">
      {#each shown as e (e.id)}
        {@const m = firstMove(e)}
        {@const inst = instrumentById(e.instrument as InstrumentId)}
        <article class="spec fig">
          <header>
            <span class="smallcaps">{inst?.code ?? ""} · {inst?.name ?? e.instrument}</span>
            <span class="smallcaps date">{fmtDate(e.at)}</span>
          </header>
          {#if m}
            <SpacingTrack rows={[{ move: m }]} time={resolveMove(m).end} still chart ghosts="always" readout rowHeight={80} />
          {:else}
            <p class="nochart">Code specimen</p>
          {/if}
          <div class="chips">{#each e.words as w (w)}<span class="chip">{w}</span>{/each}</div>
          <footer>
            <a class="btn small" href={labUrl(e.instrument, e.state)}>Open</a>
            {#if m}<a class="btn ghost small" href={labUrl("export-desk", e.state)}>Export</a>{/if}
            <button class="btn ghost small" type="button" onclick={() => deleteSpecimen(e.id)}>Delete</button>
          </footer>
        </article>
      {/each}
    </div>
  </section>
  {/if}
</div>

<style>
  .journal { display: flex; flex-direction: column; gap: 2.5rem; }
  .head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 0.5rem 1rem; margin-bottom: 1rem; }
  .head p { color: var(--graphite-strong); font-size: var(--text-sm); }
  .empty { color: var(--graphite-strong); display: flex; flex-direction: column; align-items: flex-start; gap: 0.75rem; max-width: 60ch; }
  .words { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .word { display: flex; flex-direction: column; align-items: flex-start; gap: 0.1rem; padding: 0.55rem 0.8rem; border: 1px solid var(--rule); border-radius: 8px; color: var(--ink); transition: border-color var(--dur-quick) var(--ease-out); }
  .word:hover { border-color: var(--graphite); }
  .word[aria-pressed="true"] { border-color: var(--ink); background: var(--paper-raised); }
  .word .w { font-size: 1.3rem; line-height: 1.1; }
  .word .meta { font-size: var(--text-xs); color: var(--graphite-strong); }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); gap: 1rem; }
  .spec { border: 1px solid var(--rule); border-radius: 8px; padding: 0.8rem 0.9rem; display: flex; flex-direction: column; gap: 0.5rem; background: var(--plate-bg); }
  .spec header { display: flex; justify-content: space-between; }
  .spec header .smallcaps { color: var(--graphite-strong); }
  .nochart { font-size: var(--text-sm); color: var(--graphite-strong); padding: 1rem 0; }
  .chips { display: flex; flex-wrap: wrap; gap: 0.3rem; }
  footer { display: flex; gap: 0.3rem; }
</style>
