<script lang="ts">
  /**
   * A row of UI specimens, each a small labelled motion. Hover to preview, click or tap to play;
   * all play once when the figure first comes into view. Still or reduced motion: they rest in their
   * end state and play only when clicked.
   */
  import { onMount } from "svelte";
  import Mock, { type MockKind, type MockMotion } from "./Mock.svelte";
  import { prefs } from "~/lib/prefs.svelte";

  interface Item {
    kind: MockKind;
    motion?: MockMotion;
    direction?: "enter" | "exit" | "loop";
    label: string;
    note?: string;
  }
  let { items, height = 150, columns }: { items: Item[]; height?: number; columns?: number } = $props();

  let mocks: Mock[] = $state([]);
  let root: HTMLElement;
  let still = $state(false);

  onMount(() => {
    prefs.start();
    const plate = root.closest(".plate");
    still = plate?.classList.contains("is-still") ?? false;
    const onStill = (e: Event) => (still = (e as CustomEvent<boolean>).detail);
    plate?.addEventListener("ib:still", onStill);
    // They will play by themselves once in view: until then each waits on its first frame (as FeelAB's
    // do), so the first thing you see move is the specimen itself, not a glide back to its start.
    if (!prefs.reduced && !still) mocks.forEach((m) => m?.cue());
    let done = false;
    const io = new IntersectionObserver((es) => {
      if (!done && es.some((e) => e.isIntersecting) && !prefs.reduced && !still) {
        done = true;
        mocks.forEach((m, i) => setTimeout(() => m?.play(), 300 + i * 120));
      }
    }, { threshold: 0.4 });
    io.observe(root);
    return () => {
      io.disconnect();
      plate?.removeEventListener("ib:still", onStill);
    };
  });

  /** Hover previews only when motion is welcome; a click or tap is a request, so it always plays. */
  const preview = (i: number) => {
    if (!prefs.reduced && !still) mocks[i]?.play();
  };
  const request = (i: number) => mocks[i]?.play();
</script>

<div class="specimens" bind:this={root} style={columns ? `--cols:${columns}` : undefined}>
  {#each items as it, i (i)}
    <div
      class="sp"
      role="button"
      aria-label={`${it.label}: play`}
      tabindex="0"
      onpointerenter={(e) => e.pointerType === "mouse" && preview(i)}
      onclick={() => request(i)}
      onkeydown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), request(i))}
    >
      <Mock bind:this={mocks[i]} kind={it.kind} motion={it.motion} direction={it.direction} {height} label={it.label} />
      <span class="smallcaps lbl">{it.label}</span>
      {#if it.note}<span class="note">{it.note}</span>{/if}
    </div>
  {/each}
</div>

<style>
  .specimens { display: grid; grid-template-columns: repeat(var(--cols, auto-fit), minmax(min(100%, 170px), 1fr)); gap: 1rem; }
  .sp { display: flex; flex-direction: column; gap: 0.35rem; border-radius: 8px; outline-offset: 4px; cursor: pointer; }
  .lbl { color: var(--ink); }
  .note { font-size: var(--text-sm); color: var(--graphite-strong); line-height: 1.4; }
  @media (max-width: 640px) { .specimens { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
