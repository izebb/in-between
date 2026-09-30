<script lang="ts">
  /**
   * OutlineNumber.astro for an island. The font is read at build time, so the page outlines the
   * figures (numeral() in lib/outline.ts) and hands them in; this draws them the same way.
   */
  import type { Numeral } from "~/lib/outline";

  let { text, n, class: cls = "" }: { text: string; n: Numeral; class?: string } = $props();
</script>

<span class="o-num {cls}">
  <span class="visually-hidden">{text}</span>
  <svg viewBox={n.viewBox} style={n.style} aria-hidden="true">
    {#each n.letters as d, i (i)}
      <g style="--k:{i}">
        <path class="o-hair" {d} />
        <path class="o-ink" {d} pathLength="1" />
      </g>
    {/each}
  </svg>
</span>
