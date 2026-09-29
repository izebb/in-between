<script lang="ts">
  /**
   * L5 · Frame Stepper: play anything at 1×, 0.25×, 0.1×, or step it frame by frame.
   * Page mode injects a virtual clock into a same-origin page; Code mode runs your code in the sandbox.
   */
  import { onDestroy } from "svelte";
  import Instrument from "./Instrument.svelte";
  import TimeBar from "./TimeBar.svelte";
  import CodeEditor from "./CodeEditor.svelte";
  import SandboxStage from "./SandboxStage.svelte";
  import Seg from "./controls/Seg.svelte";
  import Slider from "./controls/Slider.svelte";
  import Field from "./controls/Field.svelte";
  import { PageTransport } from "~/lib/sandbox/page.svelte";
  import { readUrlState } from "~/lib/labstate";
  import { resize } from "~/lib/actions";
  import type { SandboxTransport } from "~/lib/sandbox/transport.svelte";

  export interface StepperState {
    mode: "page" | "code";
    url: string;
    dialect: "css" | "js";
    code: string;
    pass: number;
  }

  const CSS_DEMO = `/* Change a number, then step through it frame by frame. */
.box {
  transform: translateX(0px);
  transition: transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1);
}

.is-on .box {
  transform: translateX(320px);
}
`;
  const JS_DEMO = `// Any Web Animation, CSS transition, or rAF loop runs on the lab's clock.
const box = document.querySelector('.box');

box.animate(
  [{ transform: 'translateX(0px)' }, { transform: 'translateX(320px)' }],
  { duration: 600, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'both' },
);
`;

  interface Props {
    preset?: Partial<StepperState>;
    embedded?: boolean;
  }
  let { preset = {}, embedded = false }: Props = $props();

  let lab = $state<StepperState>({
    mode: "code",
    url: "/system",
    dialect: "css",
    code: CSS_DEMO,
    pass: 1000,
    ...preset,
    ...((!embedded && readUrlState<StepperState>()) || {}),
  });

  // ---------------- page mode
  let iframe = $state<HTMLIFrameElement | null>(null);
  let src = $state(lab.url);
  let crossOrigin = $state(false);
  let pendingFF: number | null = null;
  let picking = $state(false);
  let tracked: Element | null = null;
  let trackedLabel = $state("");
  let trail = $state<{ x: number; y: number }[]>([]);
  let stageSize = $state({ w: 0, h: 0 });

  const page = new PageTransport((ff) => {
    pendingFF = ff ?? null;
    trail = [];
    iframe?.contentWindow?.location.reload();
  });

  page.onFrame(() => {
    if (!tracked || !iframe) return;
    const r = tracked.getBoundingClientRect();
    const next = [...trail, { x: r.left + r.width / 2, y: r.top + r.height / 2 }];
    trail = next.length > 240 ? next.slice(-240) : next;
  });

  function onLoad() {
    if (!iframe) return;
    try {
      const win = iframe.contentWindow as Window & typeof globalThis;
      void win.document.body; // throws when cross-origin
      crossOrigin = false;
      tracked = null;
      trackedLabel = "";
      trail = [];
      page.attach(win);
      if (pendingFF != null) {
        page.handle?.pause();
        page.handle?.fastForward(pendingFF, page.fps);
        page.playing = false;
        pendingFF = null;
      }
    } catch {
      crossOrigin = true;
    }
  }

  function load() {
    const u = lab.url.trim() || "/";
    src = u + (u.includes("?") ? "&" : "?") + "stepper=" + Date.now().toString(36);
  }

  function pick() {
    if (!iframe || crossOrigin) return;
    const doc = iframe.contentDocument!;
    picking = true;
    let last: HTMLElement | null = null;
    const over = (e: Event) => {
      last?.style.removeProperty("outline");
      last = e.target as HTMLElement;
      last.style.outline = "1px dashed #3D6BFF";
    };
    const click = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      last?.style.removeProperty("outline");
      tracked = e.target as Element;
      const el = tracked as HTMLElement;
      trackedLabel = `${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/)[0] : ""}`;
      trail = [];
      picking = false;
      doc.removeEventListener("mouseover", over, true);
      doc.removeEventListener("click", click, true);
    };
    doc.addEventListener("mouseover", over, true);
    doc.addEventListener("click", click, true);
  }

  // ---------------- code mode
  let sandboxTransport = $state<SandboxTransport | undefined>(undefined);
  function setDialect(d: "css" | "js") {
    if (d === lab.dialect) return;
    lab.dialect = d;
    lab.code = d === "css" ? CSS_DEMO : JS_DEMO;
    runCode = lab.code; // change language and code together, so the stage never runs CSS as JS
  }
  let runCode = $state(lab.code);
  let debounce: ReturnType<typeof setTimeout> | null = null;
  function codeChanged(v: string, isDrag: boolean) {
    if (debounce) clearTimeout(debounce);
    if (isDrag) runCode = v;
    else debounce = setTimeout(() => (runCode = v), 350);
  }
  $effect(() => {
    void lab.dialect;
    runCode = lab.code;
  });

  const transport = $derived(lab.mode === "code" ? (sandboxTransport ?? page) : page);
  const snapshot = $derived(JSON.parse(JSON.stringify(lab)));
  const trailPath = $derived(trail.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(""));

  onDestroy(() => page.handle?.destroy());
</script>

{#snippet codeSnip()}
  <div class="code-col">
    <div class="code-head">
      <Seg value={lab.dialect} options={[{ value: "css", label: "CSS" }, { value: "js", label: "JS" }]} label="Language" onchange={(v) => setDialect(v)} />
      <span class="smallcaps">Runs as written</span>
    </div>
    <div class="code-body">
      <CodeEditor bind:value={lab.code} language={lab.dialect === "css" ? "css" : "javascript"} onchange={codeChanged} label="Code to step through" />
    </div>
  </div>
{/snippet}

<Instrument id="frame-stepper" code="L5" name="Frame Stepper" {embedded} snapshot={snapshot} codePanel={lab.mode === "code" ? codeSnip : undefined}>
  {#snippet params()}
    <div class="param-group">
      <Field label="Source">
        <Seg bind:value={lab.mode} options={[{ value: "code", label: "Your code" }, { value: "page", label: "A page" }]} label="Source" />
      </Field>
      {#if lab.mode === "page"}
        <form class="url" onsubmit={(e) => { e.preventDefault(); load(); }}>
          <input class="mono" bind:value={lab.url} aria-label="Page address" placeholder="/chapters/03-spacing" />
          <button class="btn small" type="submit">Load</button>
        </form>
        <p class="note">Pages from this site can be slowed and stepped: their clock is replaced with the lab's. Other sites can be viewed but not stepped; browsers don't let one site touch another's time.</p>
        <div class="track-row">
          <button class="btn small" type="button" onclick={pick} aria-pressed={picking} disabled={crossOrigin}>{picking ? "Click an element…" : "Track an element"}</button>
          {#if trackedLabel}<button class="btn ghost small" type="button" onclick={() => { tracked = null; trackedLabel = ""; trail = []; }}>Clear</button>{/if}
        </div>
        {#if trackedLabel}<span class="mono hint">tracking {trackedLabel}</span>{/if}
      {:else}
        <Slider label="Loop after" bind:value={lab.pass} min={200} max={4000} step={50} unit="ms" />
        <p class="note">Edit the code: numbers drag. The stage measures every frame and draws its ghosts. Use 0.1× or the arrow keys on the scrubber to step.</p>
      {/if}
    </div>
    <div class="param-group keys">
      <span class="label">Keys (on the scrubber)</span>
      <span class="mono hint">space play/pause · ← → one frame · shift ×10</span>
    </div>
  {/snippet}

  {#snippet stage()}
    {#if lab.mode === "code"}
      <SandboxStage dialect={lab.dialect === "css" ? "css" : "js"} code={runCode} targets={["box"]} duration={lab.pass} bind:transport={sandboxTransport} ghostEvery={2} />
    {:else}
      <div class="page-stage" use:resize={(w, h) => (stageSize = { w, h })}>
        <iframe bind:this={iframe} {src} title="Page under the Frame Stepper" onload={onLoad}></iframe>
        {#if trail.length > 1}
          <svg class="trail" width={stageSize.w} height={stageSize.h} aria-hidden="true">
            <path class="path" d={trailPath} />
            {#each trail as p, i (i)}
              {#if i % 3 === 0}<circle class="ghost" cx={p.x} cy={p.y} r="5" />{/if}
            {/each}
            <circle class="key" cx={trail[trail.length - 1].x} cy={trail[trail.length - 1].y} r="5" />
          </svg>
        {/if}
        {#if crossOrigin}<div class="xo smallcaps">View only · cross-origin page</div>{/if}
      </div>
    {/if}
  {/snippet}

  {#snippet time()}
    <TimeBar {transport} />
  {/snippet}
</Instrument>

<style>
  .url { display: flex; gap: 0.35rem; }
  .url input { flex: 1; min-width: 0; font-size: var(--text-sm); padding: 0.3rem 0.45rem; border: 1px solid var(--rule); border-radius: 5px; background: var(--paper); }
  .note { font-size: var(--text-sm); color: var(--graphite-strong); line-height: 1.45; }
  .hint { font-size: var(--text-xs); color: var(--graphite-strong); }
  .track-row { display: flex; gap: 0.3rem; flex-wrap: wrap; }
  .keys { margin-top: auto; }
  .page-stage { position: relative; height: 100%; min-height: 420px; }
  .page-stage iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: var(--paper); }
  .trail { position: absolute; inset: 0; pointer-events: none; }
  .xo { position: absolute; left: 0.75rem; top: 0.6rem; background: var(--paper-raised); border: 1px solid var(--rule); padding: 0.2rem 0.45rem; border-radius: 4px; color: var(--ink); }
  .code-col { display: flex; flex-direction: column; height: 100%; }
  .code-head { display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0.6rem 0.5rem 0.75rem; border-bottom: 1px solid var(--rule); }
  .code-head .smallcaps { color: var(--graphite-strong); }
  .code-body { flex: 1; position: relative; min-height: 260px; overflow: hidden; }
</style>
