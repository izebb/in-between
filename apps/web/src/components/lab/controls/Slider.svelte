<script lang="ts">
  import NumberScrub from "./NumberScrub.svelte";
  interface Props {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    decimals?: number;
    unit?: string;
    hint?: string;
    /** Scene path this knob controls, for code ↔ knob ↔ stage linking. */
    link?: string;
    onchange?: (v: number) => void;
  }
  let { label, value = $bindable(), min, max, step = 1, decimals, unit = "", hint, link, onchange }: Props = $props();
  const id = `s-${Math.random().toString(36).slice(2, 8)}`;
  const pct = $derived(((Math.min(max, Math.max(min, value)) - min) / (max - min)) * 100);
</script>

<div class="slider" data-link={link}>
  <div class="head">
    <label for={id}>{label}</label>
    <NumberScrub bind:value {min} {max} {step} {decimals} {unit} {label} {onchange} />
  </div>
  <input
    {id}
    type="range"
    {min}
    {max}
    {step}
    bind:value
    oninput={() => onchange?.(value)}
    style={`--p:${pct}%`}
  />
  {#if hint}<span class="hint">{hint}</span>{/if}
</div>

<style>
  .slider { display: flex; flex-direction: column; gap: 0.2rem; border-radius: 4px; }
  .head { display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; }
  label { font-size: var(--text-sm); color: var(--graphite-strong); }
  .hint { font-size: var(--text-xs); color: var(--graphite-strong); font-family: var(--font-mono); }
  input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 18px;
    background: transparent;
    cursor: pointer;
    margin: 0;
  }
  input[type="range"]::-webkit-slider-runnable-track {
    height: 1px;
    background: linear-gradient(to right, var(--graphite) var(--p), var(--rule) var(--p));
  }
  input[type="range"]::-moz-range-track { height: 1px; background: var(--rule); }
  input[type="range"]::-moz-range-progress { height: 1px; background: var(--graphite); }
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 11px;
    height: 11px;
    margin-top: -5px;
    border-radius: 50%;
    background: var(--ink);
    border: 2px solid var(--paper);
    box-shadow: 0 0 0 1px var(--ink);
    transition: scale var(--dur-instant) var(--ease-out);
  }
  input[type="range"]::-moz-range-thumb {
    width: 9px; height: 9px; border-radius: 50%;
    background: var(--ink); border: 2px solid var(--paper); box-shadow: 0 0 0 1px var(--ink);
  }
  input[type="range"]:active::-webkit-slider-thumb { scale: 1.2; }
  .slider:global(.is-linked) label { color: var(--blue-pencil); }
</style>
