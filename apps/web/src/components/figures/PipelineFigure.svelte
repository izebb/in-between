<script lang="ts">
  /**
   * The rendering pipeline: which stages run every frame depends on the property you animate.
   * Geometry (left, width) re-runs layout and paint; colour and shadow re-run paint;
   * transform and opacity can skip both and go straight to the compositor.
   * The demo plays only while on screen; Still (or reduced motion) holds it at rest, and the stages
   * still say what would run.
   */
  import { onMount, untrack } from "svelte";
  import { figurePlay } from "~/lib/figure.svelte";

  type Prop = "left" | "width" | "background-color" | "box-shadow" | "transform" | "opacity";
  let prop = $state<Prop>("left");
  let demo: HTMLDivElement;
  let anim: Animation | null = null;
  let track = $state(0);
  let still = $state(false);
  let playing = $state(false);

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
    transform: "The element's pixels are already painted; the compositor only has to move the layer. No layout, no paint: style, then composite.",
    opacity: "Like transform: the compositor blends a layer that is already painted, at a new opacity. No layout, no paint.",
  };
  const BOX = 56;
  // Plain values, measured from the track: a transform keyframe with var() or % in it may not be
  // handed to the compositor, and this one has to be the real thing.
  const keys = (p: Prop, w: number): Keyframe[] =>
    ({
      left: [{ left: "0px" }, { left: `${w - BOX}px` }],
      width: [{ width: `${BOX}px` }, { width: `${w}px` }],
      "background-color": [{ backgroundColor: "var(--ink)" }, { backgroundColor: "var(--red-pencil)" }],
      "box-shadow": [{ boxShadow: "0 0 0 0 var(--demo-shadow)" }, { boxShadow: "0 12px 36px 6px var(--demo-shadow)" }],
      transform: [{ transform: "translateX(0px)" }, { transform: `translateX(${w - BOX}px)` }],
      opacity: [{ opacity: 1 }, { opacity: 0.15 }],
    })[p];

  /** (Re)build the animation for the current property, at the same point in its cycle as the last one,
   *  so switching left ⇄ transform doesn't move the box at all. */
  function build() {
    const t = anim?.currentTime ?? 0;
    anim?.cancel();
    anim = null;
    if (!demo || still || !track) return;
    anim = demo.animate(keys(prop, track), { duration: 1400, direction: "alternate", iterations: Infinity, easing: "ease-in-out" });
    anim.currentTime = t;
    if (!untrack(() => playing)) anim.pause();
  }
  $effect(() => {
    void prop;
    void still;
    void track;
    build();
  });
  $effect(() => {
    if (playing) anim?.play();
    else anim?.pause();
  });
  onMount(() => () => anim?.cancel());

  const transport = { play: () => (playing = true), pause: () => (playing = false) };
  function measure(node: HTMLElement) {
    const ro = new ResizeObserver(() => (track = node.clientWidth));
    ro.observe(node);
    return { destroy: () => ro.disconnect() };
  }
</script>

<div class="pipeline" use:figurePlay={{ transport, onstill: (v) => (still = v) }}>
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
  <div class="track" use:measure><div class="demo" bind:this={demo}></div></div>
  {#key prop}<p class="note" data-motion="fade">{NOTE[prop]}</p>{/key}
</div>

<style>
  .pipeline { display: flex; flex-direction: column; gap: 0.9rem; }
  .props { max-width: 100%; }
  .stages { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; border: 1px solid var(--rule); border-radius: 8px; overflow: hidden; }
  @media (max-width: 560px) {
    .stages { grid-template-columns: repeat(2, 1fr); }
    .stages li:nth-child(2n) { border-right: 0; }
    .stages li:nth-child(-n + 2) { border-bottom: 1px solid var(--rule); }
  }
  .stages li { display: flex; flex-direction: column; gap: 0.15rem; padding: 0.75rem 0.85rem; border-right: 1px solid var(--rule); color: var(--graphite); transition: background-color var(--dur-quick) var(--ease-out), color var(--dur-quick) var(--ease-out); }
  .stages li:last-child { border-right: 0; }
  .stages li.on { color: var(--ink); background: color-mix(in srgb, var(--red-pencil) 9%, transparent); }
  .stages li.on .state { color: var(--red-pencil); }
  .n { font-size: var(--text-xs); }
  .name { font-size: 1.3rem; line-height: 1.1; }
  .state { font-size: var(--text-xs); }
  .track { position: relative; height: 64px; border-bottom: 1px solid var(--rule); }
  /* One shadow colour for both themes: dark on paper, a glow in the lightbox. */
  .demo { --demo-shadow: color-mix(in srgb, var(--ink) 45%, transparent); position: absolute; left: 0; top: 4px; width: 56px; height: 56px; border-radius: 8px; background: var(--ink); }
  .note { font-size: var(--text-sm); color: var(--graphite-strong); max-width: 62ch; min-height: 3em; }
</style>
