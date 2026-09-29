<script lang="ts">
  /**
   * The platform version of FLIP: the View Transitions API. A card opens into its detail view;
   * the thumbnail and title are shared elements (the same view-transition-name before and after),
   * so the browser morphs them instead of cutting.
   */
  import { tick, onMount } from "svelte";
  import { prefs, watchPlateStill } from "~/lib/prefs.svelte";
  import { waapiTiming, parseSpec } from "~/lib/spec";

  let { easing = "--ease-inout", duration = 420 }: { easing?: string; duration?: number } = $props();

  const items = [
    { id: 0, title: "Spacing", sub: "Easing is spacing" },
    { id: 1, title: "Springs", sub: "Physics as feel" },
    { id: 2, title: "Stagger", sub: "Reading order" },
  ];
  const uid = Math.random().toString(36).slice(2, 7);
  let open = $state<number | null>(null);
  /** The item that carries the shared names: only one element per name may exist. */
  let active = $state<number | null>(null);
  let supported = $state(true);
  let shared = $state(true);
  let root: HTMLElement;
  let still = $state(false);
  onMount(() => {
    prefs.start();
    supported = typeof document !== "undefined" && "startViewTransition" in document;
    return watchPlateStill(root, (v) => (still = v));
  });

  function styleFor() {
    const t = waapiTiming(parseSpec(easing), duration);
    return `::view-transition-group(vt-${uid}-img), ::view-transition-group(vt-${uid}-title) { animation-duration: ${t.duration}ms; animation-timing-function: ${t.easing}; }`;
  }

  async function go(next: number | null) {
    if (next !== null) active = next;
    await tick();
    const doc = document as Document & { startViewTransition?: (cb: () => Promise<void> | void) => { finished: Promise<void> } };
    if (!supported || prefs.reduced || still || !doc.startViewTransition) {
      open = next;
      return;
    }
    const tag = document.createElement("style");
    tag.textContent = styleFor();
    document.head.appendChild(tag);
    // The page's own chapter cut is a view transition on the page scroller: keep it out of this one.
    const main = document.querySelector<HTMLElement>("[data-scroller]");
    const prevName = main?.style.viewTransitionName ?? "";
    if (main) main.style.viewTransitionName = "none";
    const vt = doc.startViewTransition(async () => {
      open = next;
      await tick();
    });
    await vt.finished.catch(() => undefined);
    tag.remove();
    if (main) main.style.viewTransitionName = prevName;
  }
  const name = (part: string, id: number) => (shared && active === id ? `vt-${uid}-${part}` : "none");
</script>

<div class="vt" bind:this={root}>
  <div class="bar">
    <label class="check"><input type="checkbox" bind:checked={shared} /> Shared elements</label>
    {#if !supported}<span class="note">This browser has no View Transitions yet: the state just changes. FLIP or Motion's <code>layout</code> does the same job.</span>{/if}
  </div>
  <div class="screen">
    {#if open === null}
      <ul class="list" role="list">
        {#each items as it (it.id)}
          <li>
            <button type="button" class="row" onclick={() => go(it.id)}>
              <span class="thumb t{it.id}" style={`view-transition-name:${name("img", it.id)}`}></span>
              <span class="txt"><span class="title serif" style={`view-transition-name:${name("title", it.id)}`}>{it.title}</span><span class="sub">{it.sub}</span></span>
            </button>
          </li>
        {/each}
      </ul>
    {:else}
      {@const it = items[open]}
      <div class="detail">
        <button type="button" class="btn small back" onclick={() => go(null)}>← Back</button>
        <span class="hero t{it.id}" style={`view-transition-name:${name("img", it.id)}`}></span>
        <span class="title big serif" style={`view-transition-name:${name("title", it.id)}`}>{it.title}</span>
        <p class="sub">{it.sub}. The hero image and the title are the same elements as in the list, in a new place.</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .vt { display: flex; flex-direction: column; gap: 0.75rem; }
  .bar { display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; }
  .check { display: flex; align-items: center; gap: 0.4rem; font-size: var(--text-sm); color: var(--graphite-strong); }
  .check input { accent-color: var(--ink); }
  .note { font-size: var(--text-sm); color: var(--graphite-strong); }
  .screen { position: relative; max-width: 420px; height: 300px; border: 1px solid var(--rule); border-radius: 10px; background: var(--paper); overflow: hidden; }
  .list { list-style: none; margin: 0; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  .row { width: 100%; display: flex; gap: 12px; align-items: center; padding: 8px; border-radius: 8px; text-align: left; transition: background-color var(--dur-quick) var(--ease-out); }
  .row:hover { background: var(--paper-raised); }
  .thumb { width: 64px; height: 48px; border-radius: 6px; flex: none; }
  .t0 { background: color-mix(in srgb, var(--red-pencil) 70%, var(--paper)); }
  .t1 { background: color-mix(in srgb, var(--blue-pencil) 60%, var(--paper)); }
  .t2 { background: color-mix(in srgb, var(--ink) 40%, var(--paper)); }
  .txt { display: flex; flex-direction: column; }
  .title { font-size: 1.2rem; line-height: 1.1; width: fit-content; }
  .sub { font-size: var(--text-sm); color: var(--graphite-strong); }
  .detail { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
  .back { align-self: flex-start; }
  .hero { display: block; width: 100%; height: 130px; border-radius: 8px; }
  .title.big { font-size: 1.8rem; }
</style>
