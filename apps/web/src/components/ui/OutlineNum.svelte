<script lang="ts">
  /**
   * OutlineNumber.astro for an island. The font is read at build time, so the page outlines the
   * figures in each theme's face (numerals() in lib/outline.ts) and hands them in; this draws them the
   * same way, the page showing its theme's (data-face, tokens.css).
   */
  import type { Face, Numeral } from "~/lib/outline";

  let { text, n, class: cls = "" }: { text: string; n: Record<Face, Numeral>; class?: string } = $props();
</script>

<span class="o-num {cls}">
  <span class="visually-hidden">{text}</span>
  {#each Object.entries(n) as [face, fig] (face)}
    <svg viewBox={fig.viewBox} style={fig.style} data-face={face} aria-hidden="true">
      {#each fig.letters as d, i (i)}
        <g style="--k:{i}">
          <path class="o-hair" {d} />
          <path class="o-ink" {d} pathLength="1" />
        </g>
      {/each}
    </svg>
  {/each}
</span>
