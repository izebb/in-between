<script lang="ts">
  /**
   * "Run your own": the code runs in a sandboxed iframe under a virtual clock.
   * Every frame is measured and reported back; we draw its ghosts, and the
   * instrument draws its graphs. Any motion you write becomes measurable.
   */
  import { onMount, untrack } from "svelte";
  import { buildSrcdoc, type SandboxDialect } from "~/lib/sandbox/harness";
  import { SandboxTransport } from "~/lib/sandbox/transport.svelte";
  import { prefs } from "~/lib/prefs.svelte";

  export interface Sample {
    t: number;
    s: Record<string, number[]>;
  }

  interface Props {
    dialect: SandboxDialect;
    code: string;
    targets: string[];
    /** Expected length of one pass, ms (from the scene). */
    duration?: number;
    transport?: SandboxTransport;
    samples?: Sample[];
    /** Draw onion-skin ghosts every n frames. */
    ghostEvery?: number;
    height?: string;
    fps?: number;
    /** Canvas: swap code in place and keep state (L7 hot reload). */
    hot?: boolean;
    params?: Record<string, unknown>;
    hz?: number | null;
    /** Show measured ghosts over the stage. */
    ghosts?: boolean;
    /** Latest frame times, for dt / fps readouts. */
    onframe?: (t: number) => void;
    /** Measured position and velocity graphs under the stage. */
    graphs?: boolean;
  }
  let {
    dialect,
    code,
    targets,
    duration = 1000,
    transport = $bindable(),
    samples = $bindable([]),
    ghostEvery = 2,
    height = "100%",
    fps = 60,
    hot = false,
    params = {},
    hz = null,
    ghosts: showGhosts = true,
    onframe,
    graphs = true,
  }: Props = $props();

  let iframe = $state<HTMLIFrameElement | null>(null);
  let box: HTMLDivElement;
  let srcdoc = $state("");
  let error = $state<string | null>(null);
  let logs = $state<string[]>([]);
  let pending: { ff?: number } = {};
  let size = $state({ w: 0, h: 0 });

  const post = (m: Record<string, unknown>) => iframe?.contentWindow?.postMessage({ ib: 1, ...m }, "*");

  let buf: Sample[] = [];
  let loadedCode = "";

  function load(o: { playing: boolean; ff?: number }) {
    buf = [];
    samples = [];
    error = null;
    logs = [];
    pending = { ff: o.ff };
    if (transport) {
      transport.time = 0;
      transport.playing = o.playing;
    }
    const doc = buildSrcdoc({
      dialect,
      code,
      targets,
      colors: prefs.pencils,
      playing: o.playing,
      rate: transport?.rate ?? 1,
      params: $state.snapshot(params) as Record<string, unknown>,
      hz,
    });
    loadedCode = code;
    // Force a reload even if the document is identical.
    srcdoc = doc + `<!-- ${Math.random().toString(36).slice(2)} -->`;
  }

  transport = new SandboxTransport(post, load);

  function onMessage(e: MessageEvent) {
    if (!iframe || e.source !== iframe.contentWindow) return;
    const m = e.data;
    if (!m || m.ib !== 1) return;
    if (m.type === "ready" && pending.ff) {
      post({ cmd: "ff", value: pending.ff, fps });
      pending = {};
    }
    if (m.type === "frame") {
      buf.push({ t: m.t, s: m.s });
      if (buf.length > 1200) buf = buf.slice(-600);
      samples = buf.slice();
      transport?.onFrame(m.t);
      onframe?.(m.t);
    }
    if (m.type === "loaded") error = null;
    if (m.type === "error") error = m.message;
    if (m.type === "log") logs = [...logs.slice(-3), m.text];
  }

  // Reload whenever the dialect or theme changes, or the code (unless hot-swapping canvas code).
  $effect(() => {
    void dialect;
    void prefs.pencils.red;
    void targets.join(",");
    const reduced = prefs.reduced;
    untrack(() => {
      if (transport) transport.duration = duration;
      load({ playing: !reduced });
    });
  });
  $effect(() => {
    const c = code;
    untrack(() => {
      if (c === loadedCode) return;
      if (hot && dialect === "canvas" && srcdoc) {
        loadedCode = c;
        post({ cmd: "code", value: c });
      } else load({ playing: !prefs.reduced });
    });
  });
  $effect(() => {
    const p = JSON.stringify(params);
    untrack(() => post({ cmd: "params", value: JSON.parse(p) }));
  });
  $effect(() => {
    const h = hz;
    untrack(() => post({ cmd: "hz", value: h }));
  });

  /** Run setup() again (canvas programs). */
  export function resetState() {
    post({ cmd: "reset" });
  }

  $effect(() => {
    if (transport) transport.fps = fps;
  });
  $effect(() => {
    if (transport) transport.duration = duration;
  });

  onMount(() => {
    prefs.start();
    addEventListener("message", onMessage);
    const ro = new ResizeObserver(() => (size = { w: box.clientWidth, h: box.clientHeight }));
    ro.observe(box);
    return () => {
      ro.disconnect();
      removeEventListener("message", onMessage);
    };
  });

  /** Measured position (distance from the first frame) and velocity of the first target. */
  const measured = $derived.by(() => {
    const target = targets[0];
    const pts = samples.filter((p) => p.s[target]).map((p) => ({ t: p.t, x: p.s[target][0], y: p.s[target][1] }));
    if (pts.length < 3) return null;
    const x0 = pts[0].x;
    const y0 = pts[0].y;
    const pos = pts.map((p) => ({ t: p.t, d: Math.hypot(p.x - x0, p.y - y0) * (p.x - x0 < 0 ? -1 : 1) }));
    const vel = pos.slice(1).map((p, i) => ({ t: p.t, v: ((p.d - pos[i].d) / Math.max(1e-3, p.t - pos[i].t)) * 1000 }));
    const T = Math.max(duration, pos[pos.length - 1].t);
    const dMin = Math.min(0, ...pos.map((p) => p.d));
    const dMax = Math.max(1, ...pos.map((p) => p.d));
    const vMax = Math.max(1, ...vel.map((p) => Math.abs(p.v)));
    return { pos, vel, T, dMin, dMax, vMax };
  });
  const GW = 220;
  const GH = 56;
  const path = (pts: { t: number; y: number }[], T: number, lo: number, hi: number) =>
    pts.map((p, i) => `${i ? "L" : "M"}${((p.t / T) * GW).toFixed(1)},${(GH - ((p.y - lo) / (hi - lo || 1)) * GH).toFixed(1)}`).join("");

  /** Onion skin from measured frames: the sample nearest each frame on the grid. */
  const ghosts = $derived.by(() => {
    const out: { target: string; x: number; y: number; w: number; h: number; o: number; k: number }[] = [];
    if (!samples.length) return out;
    const frameMs = 1000 / fps;
    const last = samples[samples.length - 1].t;
    const n = Math.min(Math.round(Math.min(last, duration) / frameMs), 240);
    let j = 0;
    for (let k = 0; k <= n; k += ghostEvery) {
      const t = k * frameMs;
      while (j < samples.length - 1 && Math.abs(samples[j + 1].t - t) <= Math.abs(samples[j].t - t)) j++;
      for (const target of targets) {
        const v = samples[j].s[target];
        if (v) out.push({ target, x: v[0], y: v[1], w: v[5] ?? 40 * v[2], h: v[6] ?? 40 * v[2], o: v[3], k });
      }
    }
    return out;
  });
</script>

<div class="sandbox fig" bind:this={box} style={`height:${height}`}>
  {#key srcdoc}
    {#if srcdoc}
      <iframe
        bind:this={iframe}
        title="Sandboxed stage running your code"
        sandbox="allow-scripts"
        {srcdoc}
      ></iframe>
    {/if}
  {/key}
  {#if showGhosts}
  <svg class="overlay" width={size.w} height={size.h} aria-hidden="true">
    {#each ghosts as g, i (i)}
      <rect
        class="ghost"
        x={g.x - g.w / 2}
        y={g.y - g.h / 2}
        width={g.w}
        height={g.h}
        rx="6"
        opacity={0.25 + 0.5 * Math.max(0.15, g.o)}
      />
      <line class="ghost" x1={g.x} x2={g.x} y1={g.y + g.h / 2 + 10} y2={g.y + g.h / 2 + 18} />
    {/each}
  </svg>
  {/if}
  {#if showGhosts}<span class="badge smallcaps">Browser · measured</span>{/if}
  {#if graphs && measured && !error}
    <div class="graphs" aria-label="Measured position and velocity">
      <div class="g">
        <span class="smallcaps">position · measured</span>
        <svg viewBox={`0 0 ${GW} ${GH}`} preserveAspectRatio="none" height={GH} aria-hidden="true">
          <line class="grid" x1="0" x2={GW} y1={GH} y2={GH} />
          <path class="ink" d={path(measured.pos.map((p) => ({ t: p.t, y: p.d })), measured.T, measured.dMin, measured.dMax)} />
        </svg>
      </div>
      <div class="g">
        <span class="smallcaps">velocity · peak {Math.round(measured.vMax)} px/s</span>
        <svg viewBox={`0 0 ${GW} ${GH}`} preserveAspectRatio="none" height={GH} aria-hidden="true">
          <line class="grid" x1="0" x2={GW} y1={GH / 2} y2={GH / 2} />
          <path class="path" d={path(measured.vel.map((p) => ({ t: p.t, y: p.v })), measured.T, -measured.vMax, measured.vMax)} />
        </svg>
      </div>
    </div>
  {/if}
  {#if error}
    <div class="error mono" role="alert">{error}</div>
  {:else if logs.length}
    <div class="logs mono" class:top={graphs && measured}>{#each logs as l}<div>{l}</div>{/each}</div>
  {/if}
</div>

<style>
  .sandbox { position: relative; width: 100%; min-height: 200px; }
  iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: transparent; color-scheme: normal; }
  .overlay { position: absolute; inset: 0; pointer-events: none; }
  .badge { position: absolute; top: 0.6rem; left: 0.75rem; color: var(--graphite-strong); }
  .error, .logs { position: absolute; left: 0.75rem; right: 0.75rem; bottom: 0.6rem; font-size: var(--text-xs); line-height: 1.4; }
  .error { color: var(--ink); background: var(--paper-raised); border: 1px solid var(--graphite); border-radius: 4px; padding: 0.35rem 0.5rem; }
  .logs { color: var(--graphite-strong); }
  /* With the graphs in the bottom corner, the log sits under the badge instead. */
  .logs.top { top: 2rem; bottom: auto; }
  /* The graphs take the width they're given: in a narrow stage they shrink rather than spill out. */
  .graphs { position: absolute; right: 0.75rem; bottom: 0.6rem; width: min(470px, calc(100% - 1.5rem)); display: flex; gap: 1rem; padding: 0.5rem 0.6rem; background: color-mix(in srgb, var(--paper) 88%, transparent); border: 1px solid var(--rule); border-radius: 6px; }
  /* A label may wrap in a narrow stage; the graphs stay bottom-aligned under it. */
  .g { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; justify-content: flex-end; gap: 0.2rem; }
  .g .smallcaps { color: var(--graphite-strong); font-size: 10px; line-height: 1.3; }
  .graphs svg { display: block; width: 100%; overflow: hidden; }
  .graphs svg :is(path, line) { vector-effect: non-scaling-stroke; }
  @media (max-width: 640px) { .graphs { display: none; } }
</style>
