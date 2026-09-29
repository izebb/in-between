<script lang="ts">
  /** A tiny timing-curve thumbnail for answer buttons. */
  import { easingFn } from "@inbetween/core";
  import { parseSpec } from "~/lib/spec";
  let { easing, w = 76, h = 46 }: { easing: string; w?: number; h?: number } = $props();
  const d = $derived.by(() => {
    const f = easingFn(parseSpec(easing)).ease;
    let lo = 0, hi = 1;
    const ys: number[] = [];
    for (let i = 0; i <= 60; i++) { const y = f(i / 60); ys.push(y); lo = Math.min(lo, y); hi = Math.max(hi, y); }
    const pad = 4;
    return ys.map((y, i) => `${i ? "L" : "M"}${(pad + (i / 60) * (w - 2 * pad)).toFixed(1)},${(h - pad - ((y - lo) / (hi - lo)) * (h - 2 * pad)).toFixed(1)}`).join("");
  });
</script>

<svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
  <path d={`M4,${h - 4}H${w - 4}M4,${h - 4}V4`} fill="none" stroke="var(--rule)" />
  <path {d} fill="none" stroke="currentColor" stroke-width="1.5" />
</svg>
