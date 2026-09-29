<script lang="ts">
  /**
   * "Run your own": the code runs in a sandboxed iframe under a virtual clock.
   * Every frame is measured and reported back; we draw its ghosts, and the
   * instrument draws its graphs. Any motion you write becomes measurable.
   */
  import { onMount, onDestroy, untrack } from "svelte";
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
    });
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
      samples = buf.slice();
      transport?.onFrame(m.t);
    }
    if (m.type === "error") error = m.message;
    if (m.type === "log") logs = [...logs.slice(-3), m.text];
  }

  // Reload whenever the code, dialect, or theme changes.
  $effect(() => {
    void code;
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
    return () => ro.disconnect();
  });
  onDestroy(() => removeEventListener("message", onMessage));

  /** Onion skin from measured frames: the sample nearest each frame on the grid. */
  const ghosts = $derived.by(() => {
    const out: { target: string; x: number; y: number; s: number; o: number; k: number }[] = [];
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
        if (v) out.push({ target, x: v[0], y: v[1], s: v[2], o: v[3], k });
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
  <svg class="overlay" width={size.w} height={size.h} aria-hidden="true">
    {#each ghosts as g, i (i)}
      <rect
        class="ghost"
        x={g.x - 20 * g.s}
        y={g.y - 20 * g.s}
        width={40 * g.s}
        height={40 * g.s}
        rx="6"
        opacity={0.25 + 0.5 * Math.max(0.15, g.o)}
      />
      <line class="ghost" x1={g.x} x2={g.x} y1={g.y + 30} y2={g.y + 38} />
    {/each}
  </svg>
  <span class="badge smallcaps">Browser · measured</span>
  {#if error}
    <div class="error mono" role="alert">{error}</div>
  {:else if logs.length}
    <div class="logs mono">{#each logs as l}<div>{l}</div>{/each}</div>
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
</style>
