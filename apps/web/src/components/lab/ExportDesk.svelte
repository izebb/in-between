<script lang="ts">
  /**
   * L9 · Export desk: one motion, every notation. CSS, Web Animations, Motion, GSAP, Canvas,
   * plus a design handoff: tokens (W3C design-token JSON) and a spec sentence a designer can read.
   */
  import { onMount, onDestroy } from "svelte";
  import { resolveMove, toResponse, type Move } from "@inbetween/core";
  import { DIALECTS, move as makeMove, type Scene } from "@inbetween/codegen";
  import SpacingTrack from "../figures/SpacingTrack.svelte";
  import TimeBar from "./TimeBar.svelte";
  import { PlayheadTransport } from "~/lib/transport.svelte";
  import { readUrlState } from "~/lib/labstate";
  import { allSpecimens, type JournalEntry } from "~/lib/store";
  import { parseSpec, describeSpec } from "~/lib/spec";
  import { prefs } from "~/lib/prefs.svelte";

  let { preset }: { preset?: { scene?: Scene } } = $props();

  const fallback: Scene = { title: "Export", moves: [makeMove({ to: 240, duration: 280 })] };
  let scene = $state<Scene>(preset?.scene ?? readUrlState<{ scene?: Scene }>()?.scene ?? fallback);
  let journal = $state<JournalEntry[]>([]);
  let easingInput = $state("");
  let easingError = $state<string | null>(null);
  let durationInput = $state(280);

  onMount(async () => {
    prefs.start();
    journal = (await allSpecimens()).filter((e) => (e.state as { scene?: Scene })?.scene);
    const m = scene.moves[0];
    easingInput = describeSpec(m.easing);
    durationInput = m.duration;
    if (!prefs.reduced) model.play();
  });

  function fromEasing() {
    try {
      const e = parseSpec(easingInput);
      easingError = null;
      scene = { title: "Export", moves: [{ ...scene.moves[0], easing: e, duration: durationInput }] };
    } catch (err) {
      easingError = String((err as Error).message);
    }
  }
  function fromJournal(id: string) {
    const e = journal.find((j) => j.id === id);
    const s = (e?.state as { scene?: Scene })?.scene;
    if (s) scene = JSON.parse(JSON.stringify(s));
  }

  const end = $derived(Math.max(...scene.moves.map((m) => resolveMove(m).end)));
  const model = new PlayheadTransport({ duration: 1000, hold: 700 });
  $effect(() => model.setDuration(end));
  onDestroy(() => model.destroy());

  const outputs = $derived(DIALECTS.map((d) => ({ id: d.id, label: d.label, code: d.gen(scene).text, ext: d.id === "css" ? "css" : "js" })));

  function tokenOf(m: Move) {
    const r = resolveMove(m);
    const easing =
      m.easing.type === "cubic"
        ? { $type: "cubicBezier", $value: [m.easing.x1, m.easing.y1, m.easing.x2, m.easing.y2] }
        : m.easing.type === "spring"
          ? { $type: "spring", $value: { stiffness: +m.easing.stiffness.toFixed(2), damping: +m.easing.damping.toFixed(2), mass: m.easing.mass, ...Object.fromEntries(Object.entries(toResponse(m.easing)).map(([k, v]) => [k, +v.toFixed(3)])) } }
          : { $type: "string", $value: describeSpec(m.easing) };
    return {
      duration: { $type: "duration", $value: `${Math.round(r.duration)}ms` },
      delay: { $type: "duration", $value: `${m.delay}ms` },
      easing,
      from: { $type: "number", $value: m.from },
      to: { $type: "number", $value: m.to },
    };
  }
  const tokens = $derived(
    JSON.stringify({ motion: Object.fromEntries(scene.moves.map((m) => [`${m.target}-${m.property}`, tokenOf(m)])) }, null, 2),
  );
  const unit = (p: string) => (p === "x" || p === "y" ? "px" : p === "rotate" ? "°" : "");
  const spec = $derived(
    scene.moves
      .map((m) => {
        const r = resolveMove(m);
        return `${m.target} · ${m.property}: ${m.from}${unit(m.property)} → ${m.to}${unit(m.property)} over ${Math.round(r.duration)}ms (${Math.round((r.duration / 1000) * 60)} frames)${m.delay ? `, after ${m.delay}ms` : ""}, ${describeSpec(m.easing)}.`;
      })
      .join("\n"),
  );

  let copied = $state<string | null>(null);
  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      copied = id;
      setTimeout(() => (copied = null), 1400);
    } catch {
      /* ignore */
    }
  }
  function download(name: string, text: string) {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  /** Tiny highlighter: comments graphite, strings ink-blue, numbers blue pencil. */
  function hl(code: string): string {
    return esc(code)
      .replace(/(\/\*[\s\S]*?\*\/|\/\/[^\n]*)/g, "\u0001c$1\u0002")
      .replace(/('[^'\n]*')/g, "\u0001s$1\u0002")
      .replace(/(?<![\w\u0001#-])(-?\d*\.?\d+)(?![\w])/g, "\u0001n$1\u0002")
      .replace(/\u0001([csn])/g, (_, k) => `<span class="t-${k}">`)
      .replace(/\u0002/g, "</span>");
  }
</script>

<div class="desk">
  <section class="source">
    <div class="preview fig">
      <SpacingTrack rows={scene.moves.slice(0, 4).map((m) => ({ move: m, label: `${m.target} · ${m.property}` }))} time={model.time} chart={false} readout ghosts="always" />
      <TimeBar transport={model} compact />
    </div>
    <div class="inputs">
      <form class="easing" onsubmit={(e) => { e.preventDefault(); fromEasing(); }}>
        <label class="label" for="ex-easing">Any easing</label>
        <div class="row">
          <input id="ex-easing" class="mono" bind:value={easingInput} placeholder="cubic-bezier(.2,.8,.2,1) · spring(response .4 bounce .2) · linear(…)" />
          <input class="mono dur" type="number" min="16" max="5000" step="1" bind:value={durationInput} aria-label="Duration in ms" />
          <button class="btn small" type="submit">Convert</button>
        </div>
        {#if easingError}<span class="err mono">{easingError}</span>{/if}
      </form>
      {#if journal.length}
        <label class="label" for="ex-journal">Or a specimen from your journal</label>
        <select id="ex-journal" class="select mono" onchange={(e) => fromJournal((e.currentTarget as HTMLSelectElement).value)}>
          <option value="">choose…</option>
          {#each journal as j (j.id)}<option value={j.id}>{j.words.join(", ") || j.instrument} · {new Date(j.at).toLocaleDateString()}</option>{/each}
        </select>
      {/if}
    </div>
  </section>

  <section class="outputs">
    {#each outputs as o (o.id)}
      <article class="out">
        <header>
          <span class="smallcaps">{o.label}</span>
          <span class="acts">
            <button class="btn ghost small" type="button" onclick={() => copy(o.id, o.code)}>{copied === o.id ? "Copied" : "Copy"}</button>
            <button class="btn ghost small" type="button" onclick={() => download(`motion.${o.id}.${o.ext}`, o.code)}>Download</button>
          </span>
        </header>
        <pre class="mono">{@html hl(o.code)}</pre>
      </article>
    {/each}
    <article class="out handoff">
      <header>
        <span class="smallcaps">Design handoff · tokens + spec</span>
        <span class="acts">
          <button class="btn ghost small" type="button" onclick={() => copy("tokens", tokens)}>{copied === "tokens" ? "Copied" : "Copy JSON"}</button>
          <button class="btn ghost small" type="button" onclick={() => download("motion.tokens.json", tokens)}>Download</button>
        </span>
      </header>
      <p class="spec">{spec}</p>
      <pre class="mono">{@html hl(tokens)}</pre>
    </article>
  </section>
</div>

<style>
  .desk { display: flex; flex-direction: column; gap: 1.5rem; }
  .source { display: grid; grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); gap: 1.5rem; align-items: start; }
  @media (max-width: 860px) { .source { grid-template-columns: minmax(0, 1fr); } }
  .preview { border: 1px solid var(--rule); border-radius: 8px; padding: 1rem; background: var(--plate-bg); display: flex; flex-direction: column; gap: 0.6rem; }
  .inputs { display: flex; flex-direction: column; gap: 0.5rem; }
  .row { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  .row input:first-child { flex-basis: 14rem; }
  .row input { flex: 1; min-width: 0; font-size: var(--text-sm); padding: 0.35rem 0.5rem; border: 1px solid var(--rule); border-radius: 5px; background: var(--paper); }
  .row .dur { flex: 0 0 5.5rem; }
  .err { font-size: var(--text-xs); color: var(--ink); }
  .select { width: 100%; font-size: var(--text-sm); padding: 0.3rem 0.4rem; border: 1px solid var(--rule); border-radius: 5px; background: var(--paper); color: var(--ink); }
  .outputs { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 380px), 1fr)); gap: 1rem; }
  .out { border: 1px solid var(--rule); border-radius: 8px; background: var(--paper-raised); overflow: hidden; display: flex; flex-direction: column; }
  .out header { display: flex; justify-content: space-between; align-items: center; padding: 0.45rem 0.5rem 0.45rem 0.9rem; border-bottom: 1px solid var(--rule); }
  .out header .smallcaps { color: var(--graphite-strong); }
  .acts { display: flex; gap: 0.2rem; }
  .out pre { margin: 0; padding: 0.8rem 0.9rem; font-size: 11.5px; line-height: 1.6; overflow: auto; max-height: 360px; white-space: pre; color: var(--ink); }
  .out :global(.t-c) { color: var(--code-comment); font-style: italic; }
  .out :global(.t-s) { color: var(--code-string); }
  .out :global(.t-n) { color: var(--code-number); }
  .handoff { grid-column: 1 / -1; }
  .spec { padding: 0.8rem 0.9rem 0; font-family: var(--font-display); font-size: 1.15rem; line-height: 1.35; white-space: pre-line; }
</style>
