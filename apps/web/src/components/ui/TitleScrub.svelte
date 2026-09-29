<script lang="ts">
  /**
   * The index title, inked like a title card: a blue-pencil line draws each letter's outline, left
   * to right; once the outlines are down, ink fills them one after another and the pencil lifts.
   * The outlines are Geist SemiBold itself (scripts/build-title.mjs), so the last frame is the title.
   *
   * It is also a tiny instrument: move the pointer across it (drag on touch, arrow keys on the
   * timeline) to scrub the frames; the playhead glides after the pointer. Let go and it plays on to
   * the end, so at rest the title is always whole.
   * Reduced motion: it starts whole. Scrubbing still works, because the reader asked for it.
   */
  import { onMount, onDestroy } from "svelte";
  import { createLoop, damp, cubicBezier, type Loop } from "@inbetween/core";
  import { easing } from "~/motion/tokens";
  import { prefs } from "~/lib/prefs.svelte";
  import { tick } from "~/lib/sound";
  import { title } from "~/lib/titlePaths";

  /** Frames per second of the timeline. */
  const FPS = 24;
  /** The pen: each letter's outline takes DRAW frames, starting DRAW_STAGGER frames after the last. */
  const DRAW = 14;
  const DRAW_STAGGER = 2;
  /** The ink: fills begin as the last outlines finish, a little apart, and take FILL frames each. */
  const FILL_START = 24;
  const FILL_STAGGER = 1.25;
  const FILL = 10;
  /** How quickly a scrub catches up with the pointer (per second): high enough to feel direct. */
  const FOLLOW = 14;
  const n = title.letters.length;
  const TOTAL = Math.ceil(FILL_START + (n - 1) * FILL_STAGGER + FILL);
  const inkEase = cubicBezier(...easing.out);
  /** A pen moves at a steady pace, easing in and out of each stroke. */
  const penEase = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);
  const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

  const PAD = 24; // room for the pencil line around the glyphs, in font units
  const vb = { x: -PAD, y: title.top - PAD, w: title.width + 2 * PAD, h: title.bottom - title.top + 2 * PAD };

  /** The playhead, in frames. Fractional: the drawing is continuous, the counter shows whole frames. */
  let pos = $state(TOTAL);
  let ready = $state(false);
  const frame = $derived(Math.round(pos));
  let root: HTMLDivElement;
  let loop: Loop | null = null;
  let mode: "idle" | "play" | "follow" = "idle";
  let target = TOTAL;
  let lastTick = TOTAL;
  let scrubbing = false;

  /** Letter i at playhead f: how much outline is drawn, how much ink is in, how much pencil is left. */
  function letterAt(i: number, f: number) {
    const draw = penEase(clamp01((f - i * DRAW_STAGGER) / DRAW));
    const fill = inkEase(clamp01((f - FILL_START - i * FILL_STAGGER) / FILL));
    return { draw, fill, pencil: draw > 0 ? 1 - fill : 0 };
  }

  function run() {
    if (loop) return;
    loop = createLoop(({ dt }) => {
      if (mode === "play") {
        pos = Math.min(TOTAL, pos + dt * FPS);
        if (pos >= TOTAL) mode = "idle";
      } else if (mode === "follow") {
        pos = damp(pos, target, FOLLOW, dt);
        if (Math.abs(pos - target) < 0.005) {
          pos = target;
          mode = "idle";
        }
      }
      if (frame !== lastTick) {
        lastTick = frame;
        tick();
      }
      if (mode === "idle") {
        loop = null;
        return false;
      }
    });
  }

  /** Play forward from wherever the title is to its last frame, in real time. */
  function playOn() {
    if (pos >= TOTAL) return;
    mode = "play";
    // The page waits for the title section before revealing what follows (patterns.ts).
    root?.setAttribute("data-playing-until", String(performance.now() + ((TOTAL - pos) / FPS) * 1000));
    run();
  }
  /** Glide the playhead to a frame. */
  function follow(f: number) {
    target = Math.max(0, Math.min(TOTAL, f));
    mode = "follow";
    run();
  }

  function scrubTo(clientX: number) {
    const r = root.getBoundingClientRect();
    follow(((clientX - r.left) / r.width) * TOTAL);
  }
  function onMove(e: PointerEvent) {
    if (e.pointerType === "mouse" || scrubbing) scrubTo(e.clientX);
  }
  function onDown(e: PointerEvent) {
    if (e.pointerType === "mouse") return;
    scrubbing = true;
    scrubTo(e.clientX);
  }
  function release() {
    scrubbing = false;
    playOn();
  }

  function onKey(e: KeyboardEvent) {
    const step = e.shiftKey ? 6 : 1;
    const base = mode === "follow" ? Math.round(target) : frame;
    const to =
      e.key === "ArrowLeft" ? base - step
      : e.key === "ArrowRight" ? base + step
      : e.key === "Home" ? 0
      : e.key === "End" ? TOTAL
      : null;
    if (to === null) return;
    e.preventDefault();
    follow(to);
  }

  onMount(() => {
    prefs.start();
    ready = true;
    if (prefs.reduced) return;
    pos = 0;
    lastTick = 0;
    playOn();
  });
  onDestroy(() => loop?.stop());
</script>

<div
  class="title-scrub"
  class:ready
  bind:this={root}
  onpointermove={onMove}
  onpointerdown={onDown}
  onpointerup={release}
  onpointercancel={release}
  onpointerleave={(e) => e.pointerType === "mouse" && release()}
  role="presentation"
>
  <h1 class="wordmark-xl">
    <span class="visually-hidden">{title.text.replace(".", "-")}</span>
    <svg
      class="ink"
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
      style={`width:${vb.w / title.em}em;height:${vb.h / title.em}em;margin:${-PAD / title.em}em`}
      aria-hidden="true"
    >
      {#each title.letters as l, i (i)}
        {@const s = letterAt(i, pos)}
        <path
          d={l.d}
          pathLength="1"
          class="glyph"
          class:mark={l.ch === "."}
          style={`fill-opacity:${s.fill.toFixed(3)};stroke-opacity:${s.pencil.toFixed(3)};stroke-dashoffset:${(1 - s.draw).toFixed(4)}`}
        />
      {/each}
    </svg>
  </h1>
  <div
    class="track"
    role="slider"
    tabindex="0"
    aria-label="Scrub the title animation"
    aria-valuemin={0}
    aria-valuemax={TOTAL}
    aria-valuenow={frame}
    aria-valuetext={`frame ${frame} of ${TOTAL}`}
    onkeydown={onKey}
    onblur={playOn}
  >
    <svg class="ticks" viewBox={`0 0 ${TOTAL} 10`} preserveAspectRatio="none" aria-hidden="true">
      {#each Array(TOTAL + 1) as _, i (i)}
        <line x1={i} x2={i} y1={i % 6 === 0 ? 1 : 5} y2="10" />
      {/each}
    </svg>
    <span class="head" style={`transform:translateX(${((pos / TOTAL) * 100).toFixed(3)}cqw)`}></span>
  </div>
  <div class="meta smallcaps" aria-hidden="true">
    <span class="count">Frame <b>{String(frame).padStart(2, "0")}</b> / {TOTAL}</span>
    <span class="hint"><span class="fine">Move across to scrub</span><span class="coarse">Drag across to scrub</span></span>
  </div>
</div>

<style>
  .title-scrub { display: inline-flex; flex-direction: column; margin-top: 0.75rem; touch-action: pan-y; cursor: ew-resize; user-select: none; -webkit-user-select: none; }
  .wordmark-xl { font-size: var(--text-3xl); line-height: 1; }
  .ink { display: block; overflow: visible; }
  /* One pencil line along the outline (dashed to its drawn length), and the ink inside it. */
  .glyph { fill: var(--ink); stroke: var(--blue-pencil); stroke-width: 14; stroke-linejoin: round; stroke-linecap: round; stroke-dasharray: 1 1; paint-order: stroke; }
  /* The point in in.between is the in-between itself: it inks in blue pencil. */
  .glyph.mark { fill: var(--blue-pencil); }
  /* Until the island takes over, hide the drawing so the first frame isn't a finished title that then vanishes. */
  @media (prefers-reduced-motion: no-preference) {
    :global(html.js:not([data-motion="reduce"])) .title-scrub:not(.ready) .ink { opacity: 0; }
  }

  .track { position: relative; height: 12px; margin-top: 0.9rem; border-radius: 2px; outline-offset: 4px; container-type: inline-size; }
  .ticks { position: absolute; inset: 0; width: 100%; height: 100%; }
  .ticks line { stroke: var(--graphite); stroke-width: 1; vector-effect: non-scaling-stroke; opacity: 0.6; }
  .head { position: absolute; left: 0; top: -3px; bottom: -1px; width: 2px; margin-left: -1px; background: var(--red-pencil); border-radius: 1px; will-change: transform; }
  .head::before { content: ""; position: absolute; top: -3px; left: -3px; width: 8px; height: 8px; border-radius: 50%; background: var(--red-pencil); }

  .meta { display: flex; justify-content: space-between; gap: 1rem; margin-top: 0.55rem; color: var(--graphite-strong); }
  .meta b { color: var(--ink); font-weight: 500; }
  .hint { color: var(--graphite); }
  .coarse { display: none; }
  @media (hover: none) { .fine { display: none; } .coarse { display: inline; } }
</style>
