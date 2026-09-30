<script lang="ts">
  /**
   * This app's own motion system, layer by layer. Every button plays the real module:
   * the same tokens, primitives, orchestration and policy the site itself runs on.
   */
  import { onMount } from "svelte";
  import { duration, exitDuration, easingCss, spring, distance, stagger as staggerTok } from "~/motion/tokens";
  import { fade, rise, scaleIn, move, play, type Primitive } from "~/motion/primitives";
  import { sequence, beat } from "~/motion/orchestration";
  import { listEnter as listEnterPattern, panelOpen, panelClose } from "~/motion/patterns";
  import { prefersReducedMotion, MAX_CONCURRENT_UI, frequencyBudget } from "~/motion/policy";
  import { prefs } from "~/lib/prefs.svelte";

  let layer = $state<"tokens" | "primitives" | "orchestration" | "patterns" | "policy">("primitives");
  let card: HTMLDivElement;
  let list: HTMLDivElement;
  let panel: HTMLDivElement;
  let open = $state(true);
  let log = $state<string[]>([]);
  onMount(() => prefs.start());

  const say = (s: string) => (log = [s, ...log].slice(0, 4));

  function prim(name: string, p: Primitive) {
    // Each press shows the primitive from its own start: clear what the last press left behind.
    card.getAnimations().forEach((a) => a.cancel());
    play(card, p);
    say(`${name}: ${p.timing.duration}ms · ${String(p.timing.easing).startsWith("linear(") ? "spring (linear())" : p.timing.easing} · on interrupt: ${p.interrupt}`);
  }
  function listEnter() {
    // orchestration's stagger, as the listEnter pattern uses it: rise, one stagger step apart.
    listEnterPattern(list);
    say(`stagger(rows, rise): ${staggerTok.step}ms apart, in reading order`);
  }
  async function seq() {
    say("sequence: fade out → beat → rise in");
    await sequence([() => play(card, fade("out")), () => void 0]);
    await beat("quick");
    play(card, rise("in", "travel"));
  }
  function togglePanel() {
    open = !open;
    (open ? panelOpen : panelClose)(panel);
    say(`panel ${open ? "open" : "close"}: interrupt → reverse from where it is (click fast)`);
  }

  const LAYERS = [
    { id: "tokens", name: "Tokens", file: "src/motion/tokens.json → tokens.css, tokens.ts, tokens.figma.json" },
    { id: "primitives", name: "Primitives", file: "src/motion/primitives.ts" },
    { id: "orchestration", name: "Orchestration", file: "src/motion/orchestration.ts" },
    { id: "patterns", name: "Patterns", file: "src/motion/patterns.ts" },
    { id: "policy", name: "Policy", file: "src/motion/policy.ts" },
  ] as const;
</script>

<div class="arch">
  <ol class="layers" role="list">
    {#each LAYERS as l, i (l.id)}
      <li>
        <button type="button" class="layer" aria-pressed={layer === l.id} onclick={() => (layer = l.id)}>
          <span class="mono n">{i + 1}</span>
          <span class="serif name">{l.name}</span>
          <span class="mono file">{l.file}</span>
        </button>
      </li>
    {/each}
  </ol>

  <div class="detail">
    {#if layer === "tokens"}
      <table class="tok mono" data-motion="fade">
        <tbody>
          {#each Object.entries(duration) as [k, v] (k)}<tr><td>--dur-{k}</td><td>{v}ms</td><td>exit {exitDuration[k as keyof typeof exitDuration]}ms</td></tr>{/each}
          {#each Object.entries(easingCss) as [k, v] (k)}<tr><td>--ease-{k}</td><td colspan="2">{v}</td></tr>{/each}
          {#each Object.entries(spring) as [k, v] (k)}<tr><td>spring.{k}</td><td>response {v.response} · bounce {v.bounce}</td><td>{v.duration}ms as linear()</td></tr>{/each}
          {#each Object.entries(distance) as [k, v] (k)}<tr><td>--dist-{k}</td><td colspan="2">{v}px</td></tr>{/each}
          <tr><td>--stagger-step</td><td colspan="2">{staggerTok.step}ms</td></tr>
        </tbody>
      </table>
    {:else if layer === "primitives" || layer === "orchestration" || layer === "patterns"}
      <div class="stage" data-motion="fade">
        {#if layer === "primitives"}
          <div class="buttons">
            <button class="btn small" type="button" onclick={() => prim("fade", fade("in"))}>fade</button>
            <button class="btn small" type="button" onclick={() => prim("rise", rise("in", "travel"))}>rise</button>
            <button class="btn small" type="button" onclick={() => prim("scaleIn", scaleIn("in"))}>scaleIn</button>
            <button class="btn small" type="button" onclick={() => prim("move", move(-80, 0))}>move</button>
          </div>
          <div class="card" bind:this={card}><div class="l w60"></div><div class="l w90"></div></div>
        {:else if layer === "orchestration"}
          <div class="buttons">
            <button class="btn small" type="button" onclick={listEnter}>stagger</button>
            <button class="btn small" type="button" onclick={seq}>sequence</button>
          </div>
          <div class="rows" bind:this={list}>{#each Array(5) as _, i (i)}<div class="row"><div class="l" style={`width:${[70, 55, 80, 60, 72][i]}%`}></div></div>{/each}</div>
          <div class="card small" bind:this={card}><div class="l w60"></div></div>
        {:else}
          <div class="buttons">
            <button class="btn small" type="button" onclick={togglePanel}>{open ? "Close" : "Open"} panel</button>
          </div>
          <div class="panel" bind:this={panel}><div class="l w60"></div><div class="l w90"></div><div class="l w75"></div></div>
          <p class="hint">Click it quickly, several times. Each new motion starts from wherever the panel is: the interruption contract says <b>reverse</b>, never jump.</p>
        {/if}
        <ul class="log mono" role="list" aria-live="polite">{#each log as l, i (i)}<li class:faint={i > 0}>{l}</li>{/each}</ul>
      </div>
    {:else}
      <ul class="policy" role="list" data-motion="fade">
        <li><b>Reduced motion</b> · reduce, don't remove. Right now: <span class="mono">{prefs.reduced || prefersReducedMotion() ? "reduced" : "full"}</span>. Distances drop to 0px, so every rise becomes a fade.</li>
        <li><b>Frequency budget</b> · seen constantly → <span class="mono">{frequencyBudget.constant.maxDuration}</span>; frequent → <span class="mono">{frequencyBudget.frequent.maxDuration}</span>; occasional → <span class="mono">{frequencyBudget.occasional.maxDuration}</span>; rare → <span class="mono">{frequencyBudget.rare.maxDuration}</span>.</li>
        <li><b>Interruption contract</b> · every primitive declares retarget, reverse, finish or queue.</li>
        <li><b>Concurrency budget</b> · at most <span class="mono">{MAX_CONCURRENT_UI}</span> UI animations at once; figures are content and exempt.</li>
        <li><b>No ad-hoc values</b> · <span class="mono">scripts/check-motion-tokens.mjs</span> fails the build on a raw duration or curve in any style.</li>
      </ul>
    {/if}
  </div>
</div>

<style>
  .arch { display: grid; grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr); gap: 1.25rem; }
  @media (max-width: 760px) { .arch { grid-template-columns: 1fr; } }
  .layers { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
  .layer { width: 100%; text-align: left; display: grid; grid-template-columns: 1.5rem 1fr; column-gap: 0.4rem; padding: 0.55rem 0.75rem; border: 1px solid var(--rule); border-radius: 7px; color: var(--ink); transition: border-color var(--dur-quick) var(--ease-out), background-color var(--dur-quick) var(--ease-out); }
  .layer:hover { border-color: var(--graphite); }
  .layer[aria-pressed="true"] { border-color: var(--ink); background: var(--paper-raised); }
  .n { font-size: var(--text-xs); color: var(--graphite); grid-row: span 2; padding-top: 0.2rem; }
  .name { font-size: 1.2rem; line-height: 1.1; }
  .file { font-size: 10.5px; color: var(--graphite-strong); }
  /* Tall enough for the longest layer (the token table), so choosing a layer never moves the page. */
  .detail { border: 1px solid var(--rule); border-radius: 8px; padding: 0.9rem; background: var(--paper); min-height: 26rem; }
  @media (max-width: 760px) { .detail { min-height: 260px; } }
  .tok { width: 100%; font-size: 11.5px; border-collapse: collapse; }
  .tok td { padding: 0.25rem 0.5rem 0.25rem 0; border-bottom: 1px solid var(--rule); color: var(--graphite-strong); }
  .tok td:first-child { color: var(--ink); }
  .stage { display: flex; flex-direction: column; gap: 0.75rem; }
  .buttons { display: flex; gap: 0.35rem; flex-wrap: wrap; }
  .card { width: 70%; padding: 10px 12px; border: 1px solid var(--rule); border-radius: 8px; background: var(--paper-raised); box-shadow: 0 8px 20px -14px rgb(0 0 0 / 0.4); }
  .card.small { width: 50%; }
  .rows { display: flex; flex-direction: column; gap: 5px; }
  .row { padding: 6px 8px; border-bottom: 1px solid var(--rule); }
  .row .l { margin: 0; }
  .panel { padding: 12px; border: 1px solid var(--rule); border-radius: 8px; background: var(--paper-raised); }
  .l { height: 7px; border-radius: 4px; background: color-mix(in srgb, var(--ink) 14%, transparent); margin: 7px 0; }
  .w60 { width: 60%; } .w75 { width: 75%; } .w90 { width: 90%; }
  .hint { font-size: var(--text-sm); color: var(--graphite-strong); }
  .log { list-style: none; margin: 0; padding: 0; font-size: 11px; color: var(--ink); min-height: 4.5em; }
  .log .faint { color: var(--graphite); }
  .policy { margin: 0; padding-left: 1.1rem; display: flex; flex-direction: column; gap: 0.55rem; font-size: var(--text-sm); }
</style>
