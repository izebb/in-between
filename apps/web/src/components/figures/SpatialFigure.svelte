<script lang="ts">
  /**
   * The app as a place. Forward slides in from the right (x is sequence); a sheet rises and the page
   * behind recedes (z is hierarchy); back reverses exactly. Switch the model off and directions go random.
   * The map on the right shows where you are.
   */
  import { onMount } from "svelte";
  import { cubicBezier } from "@inbetween/core";
  import { prefs } from "~/lib/prefs.svelte";

  let { duration = 360, coherent: startCoherent = true, hint = "Tap through the app. Then turn the model off and do it again." }: { duration?: number; coherent?: boolean; hint?: string } = $props();

  type Page = "home" | "inbox" | "message";
  const TITLES: Record<Page, string> = { home: "Home", inbox: "Inbox", message: "Message" };
  let stack = $state<Page[]>(["home"]);
  let sheet = $state(false);
  let coherent = $state(startCoherent);
  let dir = $state(1); // +1 forward, -1 back
  let axis = $state<"x" | "y">("x");
  onMount(() => prefs.start());

  const outE = cubicBezier(0.2, 0.8, 0.2, 1);
  const inE = cubicBezier(0.4, 0, 1, 1);
  const dur = () => (prefs.reduced ? 0 : duration);

  function slide(_node: Element, { enter }: { enter: boolean }) {
    const d = dir;
    const ax = axis;
    return {
      duration: enter ? dur() : Math.round(dur() * 0.7),
      easing: enter ? outE : inE,
      css: (t: number) => {
        const off = (1 - t) * 100 * (enter ? d : -d) * (enter ? 1 : 0.3);
        const tr = ax === "x" ? `translateX(${off}%)` : `translateY(${off}%)`;
        return enter ? `transform: ${tr}` : `transform: ${tr}; opacity: ${0.5 + 0.5 * t}`;
      },
    };
  }
  function rise(_node: Element) {
    return { duration: dur(), easing: outE, css: (t: number) => `transform: translateY(${(1 - t) * 100}%)` };
  }

  function pick() {
    if (coherent) axis = "x";
    else {
      axis = Math.random() < 0.5 ? "x" : "y";
      if (Math.random() < 0.5) dir = -dir;
    }
  }
  function forward(p: Page) {
    dir = 1;
    pick();
    stack = [...stack, p];
  }
  function back() {
    if (sheet) return (sheet = false);
    if (stack.length < 2) return;
    dir = -1;
    pick();
    stack = stack.slice(0, -1);
  }
  const top = $derived(stack[stack.length - 1]);
  const all: Page[] = ["home", "inbox", "message"];
</script>

<div class="spatial">
  <div class="phone" class:behind={sheet}>
    <div class="viewport">
      {#key top}
        <div class="page" in:slide={{ enter: true }} out:slide={{ enter: false }}>
          <header class="nav">
            {#if stack.length > 1 || sheet}<button type="button" class="back" onclick={back} aria-label="Back">‹</button>{/if}
            <span class="serif">{TITLES[top]}</span>
          </header>
          {#if top === "home"}
            <button type="button" class="cell" onclick={() => forward("inbox")}>Inbox <span>›</span></button>
            <div class="cell muted">Settings</div>
            <div class="cell muted">Archive</div>
          {:else if top === "inbox"}
            {#each ["A note from Ada", "Weekly digest", "Re: spacing"] as m, i (m)}
              <button type="button" class="cell" onclick={() => forward("message")}>{m} <span>›</span></button>
            {/each}
          {:else}
            <div class="msg"><div class="l w70"></div><div class="l w90"></div><div class="l w80"></div><div class="l w50"></div></div>
            <button type="button" class="btn small reply" onclick={() => (sheet = true)}>Reply</button>
          {/if}
        </div>
      {/key}
    </div>
    {#if sheet}
      <div class="sheet" in:rise out:rise>
        <div class="grab"></div>
        <span class="serif">Reply</span>
        <div class="l w90"></div><div class="l w60"></div>
        <button type="button" class="btn small" onclick={() => (sheet = false)}>Close</button>
      </div>
    {/if}
  </div>

  <div class="map" aria-label="Where you are">
    <span class="smallcaps">The place</span>
    <svg viewBox="0 0 240 162" width="240" height="162" role="img" aria-label={`You are on ${TITLES[top]}${sheet ? ", with a sheet open" : ""}`}>
      <line class="ax" x1="20" y1="110" x2="220" y2="110" />
      <text class="label" x="220" y="156" text-anchor="end">sequence (x) →</text>
      <line class="ax" x1="20" y1="110" x2="20" y2="18" />
      <text class="label" x="26" y="16">depth (z) ↑</text>
      {#each all as p, i (p)}
        {@const x = 50 + i * 70}
        <rect x={x - 22} y="88" width="44" height="30" rx="4" class={p === top && !sheet ? "here" : stack.includes(p) ? "been" : "node"} />
        <text class="label" {x} y="138" text-anchor="middle">{TITLES[p]}</text>
      {/each}
      <rect x="168" y="36" width="44" height="30" rx="4" class={sheet ? "here" : "node"} />
      <text class="label" x="190" y="30" text-anchor="middle">sheet</text>
    </svg>
    <label class="check"><input type="checkbox" bind:checked={coherent} /> Consistent spatial model</label>
    <p class="hint">{hint}</p>
  </div>
</div>

<style>
  .spatial { display: flex; gap: 2rem; flex-wrap: wrap; align-items: flex-start; }
  .phone { position: relative; width: 250px; height: 380px; border: 1px solid var(--graphite); border-radius: 22px; background: var(--paper); overflow: hidden; flex: none; }
  .viewport { position: absolute; inset: 0; transition: transform var(--dur-base) var(--ease-out), filter var(--dur-base) var(--ease-out); }
  .phone.behind .viewport { transform: scale(0.93); filter: brightness(0.85); }
  .page { position: absolute; inset: 0; padding: 14px; background: var(--paper); display: flex; flex-direction: column; gap: 6px; }
  .nav { display: flex; align-items: center; gap: 8px; height: 36px; margin-bottom: 6px; }
  .nav .serif { font-size: 1.35rem; }
  .back { font-size: 1.6rem; line-height: 1; color: var(--ink); padding: 0 4px; }
  .cell { display: flex; justify-content: space-between; align-items: center; padding: 10px 8px; border-bottom: 1px solid var(--rule); font-size: var(--text-sm); color: var(--ink); text-align: left; }
  button.cell:hover { background: var(--paper-raised); }
  .cell.muted { color: var(--graphite-strong); }
  .msg { padding: 6px 0; }
  .l { height: 7px; border-radius: 4px; background: color-mix(in srgb, var(--ink) 14%, transparent); margin: 9px 0; }
  .w50 { width: 50%; } .w60 { width: 60%; } .w70 { width: 70%; } .w80 { width: 80%; } .w90 { width: 90%; }
  .reply { align-self: flex-start; margin-top: auto; }
  .sheet { position: absolute; left: 0; right: 0; bottom: 0; height: 58%; padding: 12px 16px; background: var(--paper-raised); border-top: 1px solid var(--rule); border-radius: 16px 16px 0 0; box-shadow: 0 -10px 30px -18px rgb(0 0 0 / 0.5); display: flex; flex-direction: column; gap: 6px; }
  .sheet .serif { font-size: 1.2rem; }
  .sheet .btn { align-self: flex-end; margin-top: auto; }
  .grab { width: 36px; height: 4px; border-radius: 2px; background: var(--rule); align-self: center; margin-bottom: 4px; }
  .map { display: flex; flex-direction: column; gap: 0.6rem; }
  .map .smallcaps { color: var(--graphite-strong); }
  .map :global(.node) { fill: var(--paper); stroke: var(--graphite); }
  .map :global(.been) { fill: color-mix(in srgb, var(--blue-pencil) 14%, var(--paper)); stroke: var(--blue-pencil); }
  .map :global(.here) { fill: var(--red-pencil); stroke: var(--red-pencil); }
  .check { display: flex; align-items: center; gap: 0.4rem; font-size: var(--text-sm); color: var(--graphite-strong); }
  .check input { accent-color: var(--ink); }
  .hint { font-size: var(--text-sm); color: var(--graphite-strong); max-width: 30ch; }
</style>
