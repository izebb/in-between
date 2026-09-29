<script lang="ts">
  /**
   * The rendering pipeline: which stages run every frame depends on the property you animate.
   * Geometry (left, width) re-runs layout and paint; colour and shadow re-run paint;
   * transform and opacity can skip both and go straight to the compositor.
   */
  import { onMount, onDestroy } from "svelte";
  import { prefs, watchPlateStill } from "~/lib/prefs.svelte";

  type Prop = "left" | "width" | "background-color" | "box-shadow" | "transform" | "opacity";
  let prop = $state<Prop>("left");
  let demo: HTMLDivElement;
  let anim: Animation | null = null;
  let root: HTMLDivElement;
  let plateStill = $state(false);

  const STAGES = ["Style", "Layout", "Paint", "Composite"] as const;
  const RUNS: Record<Prop, (typeof STAGES)[number][]> = {
    left: ["Style", "Layout", "Paint", "Composite"],
    width: ["Style", "Layout", "Paint", "Composite"],
    "background-color": ["Style", "Paint", "Composite"],
    "box-shadow": ["Style", "Paint", "Composite"],
    transform: ["Style", "Composite"],
    opacity: ["Style", "Composite"],
  };
  const NOTE: Record<Prop, string> = {
    left: "Moving an element by its position changes the geometry of the page: the browser lays out again, repaints, then composites. Every frame.",
    width: "A new width means new line breaks and new neighbours' positions: layout, paint and composite, every frame.",
    "background-color": "No geometry changes, but the pixels do: the browser repaints the element's layer, then composites.",
    "box-shadow": "Shadows are painted, and blurred ones are expensive to paint. Animate a shadow's opacity on a separate layer instead.",
    transform: "The element's pixels are already painted; the compositor just moves the layer. The main thread can be busy and it still moves.",
    opacity: "Like transform: the compositor blends an existing layer at a new opacity. No layout, no paint.",
  };
  const KEYS: Record<Prop, Keyframe[]> = {
    left: [{ left: "0px" }, { left: "calc(100% - 56px)" }],
    width: [{ width: "56px" }, { width: "100%" }],
    "background-color": [{ backgroundColor: "var(--ink)" }, { backgroundColor: "var(--red-pencil)" }],
    "box-shadow": [{ boxShadow: "0 0 0 0 rgb(0 0 0 / 0.3)" }, { boxShadow: "0 12px 36px 6px rgb(0 0 0 / 0.35)" }],
    transform: [{ transform: "translateX(0)" }, { transform: "translateX(calc(var(--track) - 56px))" }],
    opacity: [{ opacity: 1 }, { opacity: 0.15 }],
  };

  function run() {
    anim?.cancel();
    // Still (the plate's toggle or reduced motion): the stages still say what runs; the demo holds.
    if (!demo || prefs.reduced || plateStill) return;
    demo.style.setProperty("--track", `${demo.parentElement!.clientWidth}px`);
    anim = demo.animate(KEYS[prop], { duration: 1400, direction: "alternate", iterations: Infinity, easing: "ease-in-out" });
  }
  $effect(() => {
    void prop;
    void plateStill;
    run();
  });
  onMount(() => {
    prefs.start();
    return watchPlateStill(root, (v) => (plateStill = v));
  });
  onDestroy(() => anim?.cancel());
</script>

<div class="pipeline" bind:this={root}>
  <div class="seg props" role="group" aria-label="Property to animate">
    {#each Object.keys(RUNS) as p (p)}
      <button type="button" aria-pressed={prop === p} onclick={() => (prop = p as Prop)}>{p}</button>
    {/each}
  </div>
  <ol class="stages" role="list" aria-label="Stages that run every frame">
    {#each STAGES as s, i (s)}
      <li class:on={RUNS[prop].includes(s)}>
        <span class="mono n">{i + 1}</span>
        <span class="serif name">{s}</span>
        <span class="state mono">{RUNS[prop].includes(s) ? "runs every frame" : "skipped"}</span>
      </li>
    {/each}
  </ol>
  <div class="track"><div class="demo" bind:this={demo}></div></div>
  <p class="note">{NOTE[prop]}</p>
</div>

<style>
  .pipeline { display: flex; flex-direction: column; gap: 0.9rem; }
  .props { max-width: 100%; }
  .stages { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border: 1px solid var(--rule); border-radius: 8px; overflow: hidden; }
  @media (max-width: 560px) { .stages { grid-template-columns: repeat(2, 1fr); } }
  .stages li { display: flex; flex-direction: column; gap: 0.15rem; padding: 0.75rem 0.85rem; border-right: 1px solid var(--rule); color: var(--graphite); transition: background-color var(--dur-quick) var(--ease-out), color var(--dur-quick) var(--ease-out); }
  .stages li:last-child { border-right: 0; }
  .stages li.on { color: var(--ink); background: color-mix(in srgb, var(--red-pencil) 9%, transparent); }
  .stages li.on .state { color: var(--red-pencil); }
  .n { font-size: var(--text-xs); }
  .name { font-size: 1.3rem; line-height: 1.1; }
  .state { font-size: var(--text-xs); }
  .track { position: relative; height: 64px; border-bottom: 1px solid var(--rule); }
  .demo { position: absolute; left: 0; top: 4px; width: 56px; height: 56px; border-radius: 8px; background: var(--ink); }
  .note { font-size: var(--text-sm); color: var(--graphite-strong); max-width: 62ch; min-height: 3em; }
</style>
