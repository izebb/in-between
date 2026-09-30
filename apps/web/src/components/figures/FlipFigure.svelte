<script lang="ts">
  /**
   * FLIP by hand: First, Last, Invert, Play. Step through the four beats and see what each one does,
   * or run them together. The ghosts show the recorded First (blue) and Last (red) boxes.
   */
  import { tick, onMount } from "svelte";
  import { parseSpec, waapiTiming } from "~/lib/spec";
  import { prefs, watchPlateStill } from "~/lib/prefs.svelte";

  let { easing = "--ease-inout", duration = 420 }: { easing?: string; duration?: number } = $props();

  const A = [1, 2, 3, 4, 5, 6];
  const B = [4, 1, 6, 2, 5, 3];
  let order = $state([...A]);
  let phase = $state<0 | 1 | 2 | 3 | 4>(0);
  let grid: HTMLDivElement;
  const els = new Map<number, HTMLElement>();
  let first = new Map<number, DOMRect>();
  let last = new Map<number, DOMRect>();
  let ghosts = $state<{ id: number; r: DOMRect; kind: "first" | "last" }[]>([]);
  let busy = $state(false);
  let rootEl: HTMLElement;
  let still = $state(false);
  onMount(() => watchPlateStill(rootEl, (v) => (still = v)));

  const LINES = [
    "const first = el.getBoundingClientRect();   // F",
    "changeLayout();                              // the DOM moves",
    "const last = el.getBoundingClientRect();    // L",
    "const from = `translate(${first.x - last.x}px, ${first.y - last.y}px)`; el.style.transform = from;   // I",
    "el.style.transform = ''; el.animate([{ transform: from }, { transform: 'none' }], timing);   // P",
  ];
  const lineFor = $derived([ -1, 0, 2, 3, 4 ][phase]);

  // Boxes are kept relative to the grid, so scrolling the page between two beats changes nothing.
  const rel = (r: DOMRect) => {
    const g = grid.getBoundingClientRect();
    return new DOMRect(r.left - g.left, r.top - g.top, r.width, r.height);
  };
  const measure = () => new Map([...els].map(([id, el]) => [id, rel(el.getBoundingClientRect())]));

  async function stepPhase() {
    if (busy) return;
    if (phase === 0) {
      first = measure();
      ghosts = [...first].map(([id, r]) => ({ id, r, kind: "first" }));
      phase = 1;
    } else if (phase === 1) {
      order = order.join() === A.join() ? [...B] : [...A];
      await tick();
      last = measure();
      ghosts = [...ghosts, ...[...last].map(([id, r]) => ({ id, r, kind: "last" as const }))];
      phase = 2;
    } else if (phase === 2) {
      for (const [id, el] of els) {
        const f = first.get(id)!;
        const l = last.get(id)!;
        el.style.transform = `translate(${f.left - l.left}px, ${f.top - l.top}px)`;
      }
      phase = 3;
    } else if (phase === 3) {
      busy = true;
      const t = waapiTiming(parseSpec(easing), duration);
      const anims = [...els.values()].map((el) => {
        const from = el.style.transform;
        el.style.transform = "";
        return el.animate([{ transform: from }, { transform: "none" }], { duration: prefs.reduced || still ? 0 : t.duration, easing: t.easing });
      });
      await Promise.all(anims.map((a) => a.finished.catch(() => undefined)));
      busy = false;
      phase = 4;
    } else {
      ghosts = [];
      phase = 0;
    }
  }

  async function run() {
    if (busy) return;
    if (phase !== 0) {
      ghosts = [];
      for (const el of els.values()) el.style.transform = "";
      phase = 0;
    }
    for (let i = 0; i < 4; i++) await stepPhase();
    ghosts = [];
  }

  function register(node: HTMLElement, id: number) {
    els.set(id, node);
    return { destroy: () => els.delete(id) };
  }
  const labels = ["Ready", "First: measured", "Last: layout changed, measured", "Invert: pushed back to First", "Play: animated to none"];
</script>

<div class="flip" bind:this={rootEl}>
  <div class="controls">
    <div class="beats smallcaps" aria-live="polite">
      {#each ["F", "L", "I", "P"] as b, i (b)}<span class:on={phase >= i + 1}>{b}</span>{/each}
      <span class="state">{labels[phase]}</span>
    </div>
    <div class="btns">
      <button class="btn small" type="button" onclick={stepPhase} disabled={busy}>{phase === 4 ? "Reset" : "Next beat"}</button>
      <button class="btn small solid" type="button" onclick={run} disabled={busy}>Run all four</button>
    </div>
  </div>
  <div class="stage">
    <div class="tiles" bind:this={grid}>
      {#each order as id (id)}
        <div class="tile" use:register={id}><span class="mono">{id}</span></div>
      {/each}
      {#each ghosts as g (g.kind + g.id)}
        <div class="ghost {g.kind}" style={`left:${g.r.x}px;top:${g.r.y}px;width:${g.r.width}px;height:${g.r.height}px`}></div>
      {/each}
    </div>
    <pre class="code mono">{#each LINES as l, i (i)}<span class:hot={i === lineFor || (phase === 2 && i === 1)}>{l}</span>
{/each}</pre>
  </div>
</div>

<style>
  .flip { display: flex; flex-direction: column; gap: 0.9rem; }
  .controls { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .beats { display: flex; gap: 0.6rem; align-items: baseline; color: var(--graphite); }
  .beats span.on { color: var(--red-pencil); }
  .beats .state { color: var(--graphite-strong); margin-left: 0.5rem; }
  .btns { display: flex; gap: 0.35rem; }
  .stage { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr); gap: 1.25rem; align-items: start; }
  @media (max-width: 720px) { .stage { grid-template-columns: 1fr; } }
  .tiles { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .tile { aspect-ratio: 1.3; border-radius: 7px; background: var(--paper-raised); border: 1px solid var(--graphite); display: grid; place-items: center; will-change: transform; }
  .tile .mono { font-size: var(--text-sm); color: var(--ink); }
  .ghost { position: absolute; border-radius: 7px; pointer-events: none; }
  .ghost.first { border: 1.5px dashed var(--blue-pencil); }
  .ghost.last { border: 1.5px solid var(--red-pencil); opacity: 0.6; }
  .code { margin: 0; font-size: 11.5px; line-height: 1.8; white-space: pre-wrap; color: var(--graphite-strong); background: var(--paper-raised); border: 1px solid var(--rule); border-radius: 6px; padding: 0.6rem 0.75rem; }
  .code span { display: block; border-radius: 3px; padding: 0 0.3rem; }
  .code span.hot { color: var(--ink); background: color-mix(in srgb, var(--red-pencil) 12%, transparent); }
</style>
