<script lang="ts" generics="T extends string | number">
  interface Props {
    options: { value: T; label: string; title?: string }[];
    value: T;
    label?: string;
    onchange?: (v: T) => void;
  }
  let { options, value = $bindable(), label, onchange }: Props = $props();
</script>

<div class="seg" role="group" aria-label={label}>
  {#each options as o (o.value)}
    <button
      type="button"
      aria-pressed={value === o.value}
      title={o.title}
      onclick={() => { value = o.value; onchange?.(o.value); }}
    >{o.label}</button>
  {/each}
</div>
