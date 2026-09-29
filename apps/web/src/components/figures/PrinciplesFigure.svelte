<script lang="ts">
  /** The twelve principles as UI clips. Hover or focus one to play it; under Still they stay onion skins. */
  import { onMount } from "svelte";
  import PrincipleClip from "./PrincipleClip.svelte";
  import { PRINCIPLES } from "~/lib/principles";
  import { watchPlateStill } from "~/lib/prefs.svelte";

  let { only }: { only?: string[] } = $props();
  const list = $derived(only ? PRINCIPLES.filter((p) => only.includes(p.id)) : PRINCIPLES);
  let active = $state<string | null>(null);
  let still = $state(false);
  let root: HTMLElement;
  onMount(() => watchPlateStill(root, (v) => (still = v)));
</script>

<ol class="principles" role="list" bind:this={root}>
  {#each list as p, i (p.id)}
    <li
      class="cell"
      tabindex="0"
      onpointerenter={() => (active = p.id)}
      onpointerleave={() => (active = null)}
      onfocus={() => (active = p.id)}
      onblur={() => (active = null)}
    >
      <PrincipleClip id={p.id} playing={active === p.id && !still} height={120} />
      <span class="n mono">{String(i + 1).padStart(2, "0")}</span>
      <span class="name serif">{p.name}</span>
      <span class="ui">{p.ui}</span>
    </li>
  {/each}
</ol>

<style>
  .principles { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr)); gap: 1.25rem 1rem; }
  .cell { display: grid; grid-template-columns: auto 1fr; column-gap: 0.5rem; row-gap: 0.15rem; align-items: start; align-content: start; border-radius: 8px; outline-offset: 4px; }
  .cell > :global(.clip) { grid-column: 1 / -1; margin-bottom: 0.35rem; }
  .n { font-size: var(--text-xs); color: var(--graphite); }
  .name { font-size: 1.1rem; line-height: 1.15; }
  .ui { grid-column: 2; font-size: var(--text-sm); color: var(--graphite-strong); line-height: 1.35; }
</style>
