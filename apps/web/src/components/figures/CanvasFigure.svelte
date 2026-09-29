<script lang="ts">
  /**
   * A live canvas program in a chapter: the loop, the maths, drawn by hand.
   * Still (reduced motion or the plate's Still toggle): the whole pass is composited as an onion skin,
   * earlier frames in blue pencil, the last one in full colour.
   */
  import { onMount, onDestroy, untrack } from "svelte";
  import { compile, type Pointer, type Program } from "~/lib/canvas/runner";
  import { ProgramTransport } from "~/lib/canvas/transport.svelte";
  import { programs, type ProgramDef } from "~/lib/canvas/programs";
  import { figurePlay } from "~/lib/figure.svelte";
  import { prefs } from "~/lib/prefs.svelte";
  import { labUrl } from "~/lib/labstate";
  import { velocityTracker } from "@inbetween/core";
  import { duration, exitDuration, easingCss } from "~/motion/tokens";
  import TimeBar from "../lab/TimeBar.svelte";
  import Slider from "../lab/controls/Slider.svelte";

  interface Props {
    program: string;
    height?: number;
    /** Override default parameter values. */
    params?: Record<string, number>;
    controls?: boolean;
    stepper?: boolean;
    /** Frames between ghosts in the still onion skin. */
    ghostEvery?: number;
    /** Show milliseconds on the time bar (hide before a chapter's FEEL beat). */
    readout?: boolean;
    /**
     * The still: "onion" composites frames of the pass as ghosts. "last" plays the whole pass onto one
     * canvas and shows where it ends, for programs whose picture builds up over frames (trails).
     */
    stillMode?: "onion" | "last";
  }
  let { program: id, height, params: overrides = {}, controls = true, stepper = true, ghostEvery, readout = true, stillMode = "onion" }: Props = $props();

  const def: ProgramDef = programs[id];
  const values = $state<Record<string, number>>({ ...Object.fromEntries((def.params ?? []).map((p) => [p.key, p.value])), ...overrides });
  const pointer: Pointer = { x: -1, y: -1, down: false, vx: 0, vy: 0 };
  const pencils = { ...prefs.pencils };
  let canvas: HTMLCanvasElement;
  let wrap: HTMLDivElement;
  let w = $state(600);
  const h = height ?? def.height ?? 260;
  let prog: Program | null = null;
  let error = $state<string | null>(null);
  let still = $state(false);

  try {
    prog = compile(def.source, { params: values, pointer, pencils });
  } catch (e) {
    error = String((e as Error).message);
  }

  function ctx2d() {
    const c = canvas?.getContext("2d");
    if (!c) return null;
    const dpr = Math.min(2, devicePixelRatio || 1);
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    return c;
  }

  const transport = new ProgramTransport(
    () => ({ program: prog, w, h, hz: values.hz || 60 }),
    (s) => {
      const c = ctx2d();
      if (!c || !prog?.draw) return;
      try {
        prog.draw(c, s, w, h);
      } catch (e) {
        error = String((e as Error).message);
      }
    },
  );
  transport.duration = (prog?.loop ?? def.loop ?? 4) * 1000;

  // A pass ends wherever its simulation happens to be, so the jump back to the first frame would be a cut.
  // Cross-dissolve it instead, as the page cut does: the old frame fades out, the new pass fades in under it.
  function dissolve() {
    if (!canvas?.parentElement) return;
    const seam = document.createElement("canvas"); // a copy of the last frame, laid over the canvas
    seam.className = "seam";
    seam.setAttribute("aria-hidden", "true");
    seam.width = canvas.width;
    seam.height = canvas.height;
    seam.getContext("2d")?.drawImage(canvas, 0, 0);
    canvas.after(seam);
    const out = seam.animate([{ opacity: 1 }, { opacity: 0 }], { duration: exitDuration.base, easing: easingCss.in, fill: "forwards" });
    out.finished.then(() => seam.remove(), () => seam.remove());
    canvas.animate([{ opacity: 0 }, { opacity: 1 }], { duration: duration.base, easing: easingCss.out, delay: Math.round(exitDuration.base * 0.5), fill: "backwards" });
  }
  transport.onwrap = dissolve;

  function drawStill() {
    const c = ctx2d();
    if (!c || !prog?.draw) return;
    const off = document.createElement("canvas");
    const dpr = Math.min(2, devicePixelRatio || 1);
    off.width = canvas.width;
    off.height = canvas.height;
    const oc = off.getContext("2d")!;
    oc.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    if (stillMode === "last") {
      transport.offline(1, (st, i, total) => {
        prog!.draw!(oc, st, w, h); // every frame, on the same canvas, as it would play
        if (i === total) {
          c.save();
          c.setTransform(1, 0, 0, 1, 0, 0);
          c.drawImage(off, 0, 0);
          c.restore();
        }
      });
      return;
    }
    const every = ghostEvery ?? def.ghostEvery ?? 6;
    const realRed = pencils.red;
    transport.offline(every, (s, i, total) => {
      const last = i === total;
      pencils.red = last ? realRed : pencils.blue;
      (pencils as Record<string, unknown>).ghost = !last;
      oc.clearRect(0, 0, w, h);
      prog!.draw!(oc, s, w, h);
      c.save();
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalAlpha = last ? 1 : 0.18 + 0.4 * (i / total);
      c.drawImage(off, 0, 0);
      c.restore();
    });
    pencils.red = realRed;
    (pencils as Record<string, unknown>).ghost = false;
  }

  function redraw() {
    Object.assign(pencils, prefs.pencils);
    if (still) drawStill();
    // setup() lays a pass out for one width. The first pass is set up before the layout is measured,
    // and a resize changes the width again: start the pass over for the width the canvas really has.
    else if (transport.width !== w) transport.restart();
    else transport.draw();
  }

  $effect(() => {
    void prefs.pencils.red;
    void w;
    void still;
    // The simulation reads and writes transport.time: never let the effect track it.
    untrack(redraw);
  });
  // A change of parameter starts the pass over, so its effect shows from the start. A choice between options
  // does it at once. A slider bends the motion live while it is dragged (restarting on every step of a drag
  // would freeze the figure on its first frame), then starts over once it comes to rest.
  let lastValues: Record<string, number> = {};
  let settle: ReturnType<typeof setTimeout> | undefined;
  function restartPass() {
    clearTimeout(settle);
    if (transport.playing) dissolve();
    transport.restart();
  }
  $effect(() => {
    void JSON.stringify(values);
    const isStill = still;
    untrack(() => {
      const changed = Object.keys(values).filter((k) => values[k] !== lastValues[k]);
      const first = !Object.keys(lastValues).length;
      lastValues = { ...values };
      transport.duration = (prog?.loop ?? def.loop ?? 4) * 1000;
      if (isStill) drawStill();
      else if (first || !changed.length) transport.restart();
      else if (changed.some((k) => def.params?.find((p) => p.key === k)?.options)) restartPass();
      else {
        if (!transport.playing) transport.draw();
        clearTimeout(settle);
        settle = setTimeout(() => !still && transport.playing && restartPass(), duration.scene);
      }
    });
  });

  // Release velocity from the last 100ms of the drag, as chapter 06 teaches.
  const tracker = velocityTracker(100);
  // Never start the pass over under the reader's hand: while they press, drag or have just let go (a throw
  // in flight), the pass runs on past its end and starts over after.
  let lastTouch = -Infinity;
  transport.holdWrap = () => pointer.down || performance.now() - lastTouch < 1000;
  function pointerEvent(type: string) {
    return (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      if (type !== "move" || pointer.down) lastTouch = performance.now();
      if (type === "down") {
        pointer.down = true;
        canvas.setPointerCapture(e.pointerId);
        tracker.reset();
      }
      if (type === "up") pointer.down = false;
      tracker.add(pointer.x, e.timeStamp);
      pointer.vx = tracker.velocity();
      if (prog?.onPointer) {
        prog.onPointer(transport.current, pointer, type);
        if (!transport.playing) transport.draw();
      }
    };
  }

  onMount(() => {
    prefs.start();
    Object.assign(pencils, prefs.pencils);
    return () => clearTimeout(settle);
  });
  onDestroy(() => transport.destroy());

  // The sandbox gets the knobs the program declares. Presentation overrides (labels: 0 before a FEEL) stay here.
  const sandboxHref = $derived(
    labUrl("canvas-sandbox", { code: def.source, params: Object.fromEntries(Object.entries(values).filter(([k]) => def.params?.some((p) => p.key === k))), title: def.title }),
  );
</script>

<div class="canvas-figure" bind:this={wrap}>
  <div class="cv" use:figurePlay={{ transport, onstill: (s) => (still = s) }} bind:clientWidth={w}>
    <canvas
      bind:this={canvas}
      style={`height:${h}px`}
      class:interactive={!!prog?.onPointer}
      aria-label={def.title}
      role="img"
      onpointerdown={pointerEvent("down")}
      onpointermove={pointerEvent("move")}
      onpointerup={pointerEvent("up")}
      onpointercancel={pointerEvent("up")}
    ></canvas>
    {#if error}<div class="error mono">{error}</div>{/if}
  </div>
  {#if controls && def.params?.length}
    <div class="controls">
      {#each def.params as p (p.key)}
        {#if p.options}
          <div class="opt">
            <span class="label">{p.label}</span>
            <div class="seg">
              {#each p.options as o (o.value)}
                <button type="button" aria-pressed={values[p.key] === o.value} onclick={() => (values[p.key] = o.value)}>{o.label}</button>
              {/each}
            </div>
          </div>
        {:else}
          <Slider label={p.label} bind:value={values[p.key]} min={p.min ?? 0} max={p.max ?? 1} step={p.step ?? 0.01} unit={p.unit ?? ""} />
        {/if}
      {/each}
    </div>
  {/if}
  <div class="foot">
    {#if stepper}<div class="tb"><TimeBar {transport} showMs={readout} /></div>{/if}
    <a class="btn ghost small open" href={sandboxHref}>Open in Canvas sandbox</a>
  </div>
</div>

<style>
  .canvas-figure { display: flex; flex-direction: column; gap: 0.75rem; }
  .cv { position: relative; }
  canvas { display: block; width: 100%; touch-action: none; }
  canvas.interactive { cursor: grab; }
  canvas.interactive:active { cursor: grabbing; }
  .cv :global(.seam) { position: absolute; left: 0; top: 0; width: 100%; height: 100%; pointer-events: none; }
  .controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); gap: 0.75rem 1.25rem; }
  .opt { display: flex; flex-direction: column; gap: 0.35rem; }
  .foot { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; border-top: 1px solid var(--rule); padding-top: 0.6rem; }
  .tb { flex: 1; min-width: 260px; }
  .open { margin-left: auto; }
  .error { position: absolute; left: 0.5rem; bottom: 0.5rem; font-size: var(--text-xs); background: var(--paper-raised); border: 1px solid var(--graphite); padding: 0.3rem 0.5rem; border-radius: 4px; }
</style>
