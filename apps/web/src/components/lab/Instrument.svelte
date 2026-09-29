<script lang="ts">
  /**
   * The instrument shell. One grammar for every instrument:
   * parameters on the left, stage in the centre, time underneath, code on the right.
   */
  import type { Snippet } from "svelte";
  import { onMount } from "svelte";
  import { LinkState, linkMatches } from "~/lib/link.svelte";
  import { labUrl, writeUrlState } from "~/lib/labstate";
  import { saveSpecimen, uid } from "~/lib/store";
  import { prefs } from "~/lib/prefs.svelte";

  interface Props {
    id: string;
    code: string;
    name: string;
    /** Embedded in a chapter (compact header, "Open in Lab") or standalone at /lab/<id>. */
    embedded?: boolean;
    /** Serialisable state: for the URL, the Journal and "Open in Lab". */
    snapshot: unknown;
    link?: LinkState;
    params: Snippet;
    stage: Snippet;
    time?: Snippet;
    codePanel?: Snippet;
    /** Extra header actions. */
    actions?: Snippet;
    minHeight?: string;
    /** "code-first": editor on the left, stage on the right (Canvas Sandbox). */
    layout?: "standard" | "code-first";
  }
  let { id, code, name, embedded = false, snapshot, link = new LinkState(), params, stage, time, codePanel, actions, minHeight, layout = "standard" }: Props = $props();

  let root: HTMLElement;
  let saving = $state(false);
  let words = $state("");
  let savedNote = $state("");
  let shared = $state(false);

  const SUGGEST = ["snappy", "heavy", "floaty", "nervous", "calm", "playful", "precise", "sluggish", "bouncy", "crisp", "gentle", "abrupt"];

  // Light every element (knob, stage mark) linked to the hot path.
  $effect(() => {
    const g = link.group;
    if (!root) return;
    root.querySelectorAll<HTMLElement>("[data-link]").forEach((el) => {
      el.classList.toggle("is-linked", !!g && linkMatches(el.dataset.link!, g));
    });
  });

  function hoverFrom(source: "stage" | "knob") {
    return (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-link]");
      const g = el?.dataset.link ?? null;
      if (g !== link.group || link.source !== source) link.set(g, source);
    };
  }
  const leave = () => link.set(null, "stage");

  // Standalone instruments keep their state in the URL.
  $effect(() => {
    const s = JSON.stringify(snapshot);
    if (!embedded && s) writeUrlState(JSON.parse(s));
  });

  async function save() {
    const list = words.split(/[,\s]+/).map((w) => w.trim().toLowerCase()).filter(Boolean);
    await saveSpecimen({ id: uid(), at: Date.now(), instrument: id, state: JSON.parse(JSON.stringify(snapshot)), words: list });
    saving = false;
    words = "";
    savedNote = "Saved to your journal";
    setTimeout(() => (savedNote = ""), 1800);
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(new URL(labUrl(id, JSON.parse(JSON.stringify(snapshot))), location.origin).href);
      shared = true;
      setTimeout(() => (shared = false), 1400);
    } catch {
      /* ignore */
    }
  }

  onMount(() => prefs.start());
</script>

<section class="instrument-wrap" class:embedded aria-label={`${code} ${name}`}>
  <header class="i-bar">
    <div class="i-title">
      <span class="smallcaps">{code}</span>
      <span class="serif">{name}</span>
    </div>
    <div class="i-actions">
      {#if actions}{@render actions()}{/if}
      {#if savedNote}<span class="smallcaps note" data-motion="fade">{savedNote}</span>{/if}
      <button class="btn ghost small" type="button" onclick={() => (saving = !saving)} aria-expanded={saving}>Save to Journal</button>
      {#if embedded}
        <a class="btn small" href={labUrl(id, JSON.parse(JSON.stringify(snapshot)))}>Open in Lab</a>
      {:else}
        <button class="btn ghost small" type="button" onclick={share}>{shared ? "Link copied" : "Share"}</button>
      {/if}
    </div>
  </header>
  {#if saving}
    <form class="journal-form" data-motion="rise" onsubmit={(e) => { e.preventDefault(); save(); }}>
      <label class="label" for={`words-${id}`}>How does it feel? A few words.</label>
      <div class="jf-row">
        <input id={`words-${id}`} class="words mono" bind:value={words} placeholder="snappy, confident" autocomplete="off" />
        <button class="btn solid small" type="submit">Save</button>
      </div>
      <div class="suggest">
        {#each SUGGEST as w (w)}
          <button type="button" class="chip" onclick={() => (words = words ? `${words}, ${w}` : w)}>{w}</button>
        {/each}
      </div>
    </form>
  {/if}
  <div class="instrument" class:no-code={!codePanel} class:code-first={layout === "code-first"} bind:this={root} style={minHeight ? `min-height:${minHeight}` : undefined}>
    <div class="i-params" onpointerover={hoverFrom("knob")} onpointerleave={leave} role="group" aria-label="Parameters">
      {@render params()}
    </div>
    <div class="i-stage fig" onpointerover={hoverFrom("stage")} onpointerleave={leave} role="group" aria-label="Stage">
      {@render stage()}
    </div>
    {#if time}
      <div class="i-time">{@render time()}</div>
    {/if}
    {#if codePanel}
      <div class="i-code">{@render codePanel()}</div>
    {/if}
  </div>
</section>

<style>
  .instrument-wrap { display: flex; flex-direction: column; gap: 0.6rem; }
  .i-bar { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }
  .i-title { display: flex; align-items: baseline; gap: 0.6rem; }
  .i-title .smallcaps { color: var(--graphite-strong); }
  .i-title .serif { font-size: 1.5rem; line-height: 1; }
  .embedded .i-title .serif { font-size: 1.2rem; }
  .i-actions { display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap; }
  .note { color: var(--graphite-strong); margin-right: 0.3rem; }
  .journal-form { border: 1px solid var(--rule); border-radius: 6px; padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; background: var(--paper-raised); }
  .jf-row { display: flex; gap: 0.4rem; }
  .words { flex: 1; min-width: 0; font-size: var(--text-sm); padding: 0.3rem 0.5rem; border: 1px solid var(--rule); border-radius: 4px; background: var(--paper); }
  .suggest { display: flex; flex-wrap: wrap; gap: 0.3rem; }
  .suggest .chip { cursor: pointer; }
  .suggest .chip:hover { color: var(--ink); border-color: var(--graphite); }
  .instrument :global([data-link].is-linked) { outline: 1px dashed color-mix(in srgb, var(--blue-pencil) 70%, transparent); outline-offset: 3px; border-radius: 3px; }
  .instrument :global(svg [data-link].is-linked) { outline: none; stroke: var(--blue-pencil); }
</style>
