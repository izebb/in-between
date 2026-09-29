<script lang="ts">
  /** A number you can drag horizontally (like a dial), click to type, or nudge with arrow keys. */
  interface Props {
    value: number;
    min?: number;
    max?: number;
    step?: number;
    decimals?: number;
    unit?: string;
    label?: string;
    onchange?: (v: number) => void;
  }
  let { value = $bindable(), min = -Infinity, max = Infinity, step = 1, decimals, unit = "", label = "", onchange }: Props = $props();

  const dec = $derived(decimals ?? (step < 1 ? Math.ceil(-Math.log10(step) - 1e-9) : 0));
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const snap = (v: number) => Math.round(v / step) * step;
  const shown = $derived(Number.isFinite(value) ? value.toFixed(dec) : "—");

  let editing = $state(false);
  let draft = $state("");
  let dragging = $state(false);

  function commit(v: number) {
    const nv = Number(clamp(snap(v)).toFixed(dec));
    if (nv !== value) {
      value = nv;
      onchange?.(nv);
    }
  }

  function down(e: PointerEvent) {
    if (editing || e.button !== 0) return;
    const el = e.currentTarget as HTMLElement;
    const x0 = e.clientX;
    const v0 = value;
    let moved = false;
    el.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - x0;
      if (!moved && Math.abs(dx) < 3) return;
      moved = true;
      dragging = true;
      const mult = ev.altKey ? 0.1 : ev.shiftKey ? 10 : 1;
      commit(v0 + Math.round(dx / 3) * step * mult);
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      dragging = false;
      if (!moved) {
        editing = true;
        draft = shown;
      }
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
  }

  function key(e: KeyboardEvent) {
    const mult = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      commit(value + step * mult);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      commit(value - step * mult);
    } else if (e.key === "Enter") {
      editing = true;
      draft = shown;
    }
  }

  function focusInput(node: HTMLInputElement) {
    node.focus();
    node.select();
  }
</script>

{#if editing}
  <input
    class="scrub-input mono"
    use:focusInput
    bind:value={draft}
    aria-label={label}
    onblur={() => { const n = parseFloat(draft); if (Number.isFinite(n)) commit(n); editing = false; }}
    onkeydown={(e) => { if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur(); if (e.key === "Escape") editing = false; }}
  />
{:else}
  <span
    class="scrub mono"
    class:dragging
    role="spinbutton"
    tabindex="0"
    aria-label={label}
    aria-valuenow={value}
    aria-valuemin={Number.isFinite(min) ? min : undefined}
    aria-valuemax={Number.isFinite(max) ? max : undefined}
    onpointerdown={down}
    onkeydown={key}
  >{shown}<span class="unit">{unit}</span></span>
{/if}

<style>
  .scrub {
    cursor: ew-resize;
    user-select: none;
    font-size: var(--text-sm);
    color: var(--ink);
    padding: 0 0.2rem;
    border-radius: 3px;
    border-bottom: 1px dotted color-mix(in srgb, var(--blue-pencil) 70%, transparent);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    transition: background-color var(--dur-quick) var(--ease-out);
  }
  .scrub:hover, .scrub.dragging { background: color-mix(in srgb, var(--blue-pencil) 12%, transparent); }
  .unit { color: var(--graphite-strong); margin-left: 1px; }
  .scrub-input {
    width: 5.5rem;
    font-size: var(--text-sm);
    padding: 0 0.25rem;
    border: 1px solid var(--graphite);
    border-radius: 3px;
    background: var(--paper);
    text-align: right;
  }
</style>
