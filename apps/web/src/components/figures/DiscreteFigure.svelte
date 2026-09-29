<script lang="ts">
  /**
   * Enter and exit in pure CSS: @starting-style gives an element a style to arrive *from*;
   * transition-behavior: allow-discrete lets `display` wait for the exit to finish.
   * This panel really is toggled with the `hidden` attribute. Under reduced motion (or the plate's
   * Still preview) the nudge distance is 0, so the enter and exit are fades.
   */
  import { onMount } from "svelte";
  import { watchPlateStill } from "~/lib/prefs.svelte";

  let open = $state(false);
  let still = $state(false);
  let root: HTMLElement;
  onMount(() => watchPlateStill(root, (v) => (still = v)));
  const SOURCE = `.panel {
  transition: opacity var(--dur-base) var(--ease-out),
              translate var(--dur-base) var(--ease-out),
              display var(--dur-base) allow-discrete;
}

.panel[hidden] {                 /* exit: quicker, accelerating */
  display: none;
  opacity: 0;
  translate: 0 var(--dist-nudge);
  transition-duration: var(--dur-base-exit);
  transition-timing-function: var(--ease-in);
}

@starting-style {                /* enter: arrive from here */
  .panel:not([hidden]) {
    opacity: 0;
    translate: 0 var(--dist-nudge);
  }
}`;
</script>

<div class="discrete" class:still bind:this={root}>
  <div class="demo">
    <button class="btn" type="button" aria-expanded={open} onclick={() => (open = !open)}>{open ? "Hide panel" : "Show panel"}</button>
    <div class="panel" hidden={!open}>
      <div class="l w60"></div><div class="l w90"></div><div class="l w75"></div>
    </div>
  </div>
  <pre class="code mono">{SOURCE}</pre>
</div>

<style>
  .discrete { display: grid; grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr); gap: 1.5rem; align-items: start; }
  @media (max-width: 720px) { .discrete { grid-template-columns: 1fr; } }
  .demo { display: flex; flex-direction: column; gap: 0.75rem; align-items: flex-start; min-height: 150px; }
  .panel {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid var(--rule);
    border-radius: 8px;
    background: var(--paper-raised);
    box-shadow: 0 10px 24px -18px rgb(0 0 0 / 0.5);
    transition: opacity var(--dur-base) var(--ease-out), translate var(--dur-base) var(--ease-out), display var(--dur-base) allow-discrete;
  }
  .panel[hidden] {
    display: none;
    opacity: 0;
    translate: 0 var(--dist-nudge);
    transition-duration: var(--dur-base-exit);
    transition-timing-function: var(--ease-in);
  }
  @starting-style {
    .panel:not([hidden]) { opacity: 0; translate: 0 var(--dist-nudge); }
  }
  .still { --dist-nudge: 0px; } /* the reduced-motion tokens, previewed: reduce, don't remove */
  .l { height: 7px; border-radius: 4px; background: color-mix(in srgb, var(--ink) 14%, transparent); margin: 7px 0; }
  .w60 { width: 60%; } .w75 { width: 75%; } .w90 { width: 90%; }
  .code { margin: 0; font-size: 11.5px; line-height: 1.65; white-space: pre-wrap; color: var(--ink); background: var(--paper-raised); border: 1px solid var(--rule); border-radius: 6px; padding: 0.7rem 0.85rem; }
</style>
