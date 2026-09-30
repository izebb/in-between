<script lang="ts">
  /**
   * L7 · Canvas sandbox: motion from scratch. setup(), update(state, dt), draw(ctx, state, w, h)
   * are scaffolded; edits hot-reload and keep state. dt and fps are read out; the refresh rate
   * can be simulated (30 / 60 / 120Hz) to see which code survives.
   */
  import Instrument from "./Instrument.svelte";
  import TimeBar from "./TimeBar.svelte";
  import CodeEditor from "./CodeEditor.svelte";
  import SandboxStage from "./SandboxStage.svelte";
  import Slider from "./controls/Slider.svelte";
  import Field from "./controls/Field.svelte";
  import { programs } from "~/lib/canvas/programs";
  import { readUrlState } from "~/lib/labstate";
  import type { SandboxTransport } from "~/lib/sandbox/transport.svelte";

  export interface SandboxState {
    code: string;
    params: Record<string, number>;
    hz: number;
    title?: string;
    example?: string;
  }

  const BLANK = `// setup() runs once. update() and draw() run every frame; dt is in seconds.
// Edit freely: the canvas hot-reloads and keeps its state. Reset runs setup() again.
// Helpers: lerp, clamp, damp, random, noise1, noise2, cubicBezier, circle, segment, label.
// Globals: params, pointer { x, y, down, vx, vy }, pencils { ink, red, blue, graphite, rule }.

function setup(width, height) {
  return { x: 40, y: height / 2, vx: 240 };
}

function update(s, dt) {
  s.x += s.vx * dt;                       // pixels per second × seconds
  if (s.x > 460 || s.x < 40) s.vx *= -1;
}

function draw(ctx, s, width, height) {
  ctx.clearRect(0, 0, width, height);
  segment(ctx, 40, s.y + 20, 460, s.y + 20, pencils.rule);
  circle(ctx, s.x, s.y, 14, pencils.red);
}
`;

  interface Props {
    preset?: Partial<SandboxState>;
    embedded?: boolean;
  }
  let { preset = {}, embedded = false }: Props = $props();
  const fromUrl = (!embedded && readUrlState<SandboxState>()) || {};
  let lab = $state<SandboxState>({ code: BLANK, params: {}, hz: 0, example: "blank", ...preset, ...fromUrl });

  let runCode = $state(lab.code);
  let debounce: ReturnType<typeof setTimeout> | null = null;
  function edited(v: string, isDrag: boolean) {
    if (debounce) clearTimeout(debounce);
    if (isDrag) runCode = v;
    else debounce = setTimeout(() => (runCode = v), 300);
  }

  const def = $derived(lab.example && lab.example !== "blank" ? programs[lab.example] : Object.values(programs).find((p) => p.source === lab.code));
  function choose(id: string) {
    lab.example = id;
    if (id === "blank") {
      lab.code = BLANK;
      lab.params = {};
    } else {
      const p = programs[id];
      lab.code = p.source;
      lab.params = Object.fromEntries((p.params ?? []).map((x) => [x.key, x.value]));
    }
    runCode = lab.code;
    stageRef?.resetState();
  }
  // Programs opened from a chapter bring their params; make sure every declared knob has a value.
  $effect(() => {
    for (const p of def?.params ?? []) if (lab.params[p.key] === undefined) lab.params[p.key] = p.value;
  });

  let sandboxTransport = $state<SandboxTransport | undefined>(undefined);
  let stageRef: SandboxStage | undefined = $state();
  let times: number[] = [];
  let dt = $state(0);
  let fps = $state(0);
  let frames = $state(0);
  function onframe(t: number) {
    times.push(t);
    if (times.length > 31) times.shift();
    frames++;
    if (times.length > 1) {
      dt = times[times.length - 1] - times[times.length - 2];
      const span = times[times.length - 1] - times[0];
      fps = span > 0 ? ((times.length - 1) * 1000) / span : 0;
    }
  }
  const snapshot = $derived(JSON.parse(JSON.stringify(lab)));
</script>

{#snippet codeSnip()}
  <div class="code-col">
    <div class="code-head">
      <span class="smallcaps">{lab.title ?? def?.title ?? "Your program"} · JS</span>
      <span class="smallcaps hint">edits apply live · state kept</span>
    </div>
    <div class="code-body">
      <!-- Another program fades in; edits to this one don't. -->
      {#key lab.example}
        <div class="swap" data-motion="fade">
          <CodeEditor bind:value={lab.code} language="javascript" onchange={edited} label="Canvas program" />
        </div>
      {/key}
    </div>
  </div>
{/snippet}

<Instrument id="canvas-sandbox" code="L7" name="Canvas sandbox" {embedded} {snapshot} codePanel={codeSnip} layout="code-first">
  {#snippet params()}
    <div class="param-group">
      <Field label="Start from">
        <select class="select mono" value={lab.example ?? "blank"} onchange={(e) => choose((e.currentTarget as HTMLSelectElement).value)}>
          {#if !def && lab.code !== BLANK}<option value={lab.example ?? "custom"}>{lab.title ?? "Custom program"}</option>{/if}
          <option value="blank">Blank scaffold</option>
          {#each Object.values(programs) as p (p.id)}<option value={p.id}>{p.title}</option>{/each}
        </select>
      </Field>
      <div class="row">
        <button class="btn small" type="button" onclick={() => stageRef?.resetState()}>Reset state</button>
      </div>
    </div>
    <div class="param-group">
      <Field label="Refresh rate">
        <div class="seg" role="group" aria-label="Simulated refresh rate">
          {#each [{ v: 0, l: "Display" }, { v: 30, l: "30Hz" }, { v: 60, l: "60Hz" }, { v: 120, l: "120Hz" }] as o (o.v)}
            <button type="button" aria-pressed={lab.hz === o.v} onclick={() => (lab.hz = o.v)}>{o.l}</button>
          {/each}
        </div>
      </Field>
      <div class="readouts mono" aria-live="off">
        <span><span class="k">dt</span> <b>{dt.toFixed(1)}</b>ms</span>
        <span><span class="k">fps</span> <b>{Math.round(fps)}</b></span>
        <span><span class="k">frames</span> <b>{frames}</b></span>
      </div>
    </div>
    {#if def?.params?.length}
      <div class="param-group">
        {#each def.params as p (p.key)}
          {#if p.options}
            <Field label={p.label}>
              <div class="seg">
                {#each p.options as o (o.value)}<button type="button" aria-pressed={lab.params[p.key] === o.value} onclick={() => (lab.params[p.key] = o.value)}>{o.label}</button>{/each}
              </div>
            </Field>
          {:else}
            <Slider label={p.label} value={lab.params[p.key] ?? p.value} min={p.min ?? 0} max={p.max ?? 1} step={p.step ?? 0.01} unit={p.unit ?? ""} onchange={(v) => (lab.params[p.key] = v)} />
          {/if}
        {/each}
      </div>
    {/if}
  {/snippet}

  {#snippet stage()}
    <SandboxStage bind:this={stageRef} dialect="canvas" code={runCode} targets={[]} duration={60000} hot params={lab.params} hz={lab.hz || null} ghosts={false} bind:transport={sandboxTransport} {onframe} />
  {/snippet}

  {#snippet time()}
    {#if sandboxTransport}<TimeBar transport={sandboxTransport} />{/if}
  {/snippet}
</Instrument>

<style>
  .code-col { display: flex; flex-direction: column; height: 100%; min-height: 480px; max-height: 720px; }
  .code-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; padding: 0.7rem 0.75rem; border-bottom: 1px solid var(--rule); }
  .code-head .smallcaps { color: var(--graphite-strong); }
  .code-body { flex: 1; position: relative; min-height: 320px; overflow: hidden; }
  .swap { position: absolute; inset: 0; }
  .select { width: 100%; font-size: var(--text-sm); padding: 0.3rem 0.4rem; border: 1px solid var(--rule); border-radius: 5px; background: var(--paper); color: var(--ink); }
  .row { display: flex; gap: 0.3rem; }
  .readouts { display: flex; gap: 1rem; font-size: var(--text-xs); color: var(--graphite-strong); }
  .readouts b { color: var(--ink); font-weight: 500; }
  .readouts .k { color: var(--graphite); }
</style>
