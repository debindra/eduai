<script lang="ts">
  /**
   * Compact BS-primary date picker for forms — emits AD ISO on select.
   */
  import NepaliCalendar from './NepaliCalendar.svelte';
  import { adToBs, formatAdSecondary, formatBsHeading } from './nepali-calendar-logic';

  type Props = {
    id?: string;
    label: string;
    value: string;
    required?: boolean;
    onChange: (adIso: string) => void;
  };

  let { id, label, value, required = false, onChange }: Props = $props();

  let open = $state(false);
  const parts = $derived(value ? adToBs(value) : null);
</script>

<div class="space-y-1">
  <label class="block text-sm font-medium text-slate-700" for={id}>
    {label}
    {#if required}<span class="text-rose-600">*</span>{/if}
  </label>
  <button
    id={id}
    type="button"
    class="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm"
    aria-expanded={open}
    onclick={() => (open = !open)}
  >
    <span>
      {#if parts}
        <span class="font-semibold text-slate-900">{formatBsHeading(parts.bsYear, parts.bsMonth)} {parts.bsDay}</span>
        <span class="ml-2 text-xs text-slate-500">AD {formatAdSecondary(value)}</span>
      {:else}
        <span class="text-slate-400">Select date</span>
      {/if}
    </span>
    <span class="text-slate-400">{open ? '▲' : '▼'}</span>
  </button>
  {#if open}
    <div class="mt-2">
      <NepaliCalendar
        bsYear={parts?.bsYear}
        bsMonth={parts?.bsMonth}
        value={value || null}
        initialView="month"
        onSelect={(adIso) => {
          onChange(adIso);
          open = false;
        }}
      />
    </div>
  {/if}
</div>
