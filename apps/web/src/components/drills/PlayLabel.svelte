<script lang="ts">
  /**
   * A drill's play button label. Clips play by themselves, so the button replays ("Replay", with the replay
   * mark). Under reduced motion nothing plays until asked, so it reads "Play", with a play triangle.
   */
  import ReplayIcon from "../ui/ReplayIcon.svelte";
  import { prefs } from "~/lib/prefs.svelte";
  let { what = "" }: { what?: string } = $props();
</script>

{#if prefs.reduced}
  <svg class="play-ico" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3v10l8-5z" fill="currentColor" /></svg>Play{what ? ` ${what}` : ""}
{:else}
  <ReplayIcon />Replay{what ? ` ${what}` : ""}
{/if}

<style>
  .play-ico { width: 11px; height: 11px; }
</style>
