<script lang="ts">
  import type { Snippet } from "svelte";
  let { label, children, link }: { label: string; children: Snippet; link?: string } = $props();
</script>

<div class="field" data-link={link}>
  <span class="label">{label}</span>
  {@render children()}
</div>

<style>
  .field { display: flex; flex-direction: column; gap: 0.4rem; }
</style>
