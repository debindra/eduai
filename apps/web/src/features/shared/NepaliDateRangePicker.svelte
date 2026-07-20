<script lang="ts">
  /**
   * Compact BS-primary date-range picker — click start, then end.
   * Emits AD ISO start/end via onChange.
   */
  import NepaliCalendar from './NepaliCalendar.svelte';
  import {
    adToBs,
    formatAdDateRangeSecondary,
    formatBsDateRangePrimary,
    normalizeDateRange,
  } from './nepali-calendar-logic';

  type Props = {
    id?: string;
    label: string;
    startDate: string;
    endDate: string;
    required?: boolean;
    /** Aria labels for test doubles / a11y of the summary button. */
    startAriaLabel?: string;
    endAriaLabel?: string;
    onChange: (range: { startDate: string; endDate: string }) => void;
  };

  let {
    id,
    label,
    startDate,
    endDate,
    required = false,
    startAriaLabel,
    endAriaLabel,
    onChange,
  }: Props = $props();

  let open = $state(false);
  /** First click in an open picker — waiting for end. */
  let pendingStart = $state<string | null>(null);

  const displayStart = $derived(pendingStart ?? startDate);
  const displayEnd = $derived(pendingStart ? '' : endDate);
  const hasRange = $derived(Boolean(startDate && endDate));
  const anchorParts = $derived(
    displayStart ? adToBs(displayStart) : endDate ? adToBs(endDate) : null,
  );
  const hint = $derived(
    pendingStart
      ? 'Select end date'
      : hasRange
        ? 'Click a day to set a new start'
        : 'Select start date',
  );

  const openPicker = () => {
    open = !open;
    if (!open) pendingStart = null;
  };

  const handleSelect = (adIso: string) => {
    if (!pendingStart) {
      pendingStart = adIso;
      return;
    }
    const range = normalizeDateRange(pendingStart, adIso);
    pendingStart = null;
    onChange(range);
    open = false;
  };
</script>

<div class="space-y-1" data-testid="nepali-date-range-picker">
  <label class="block text-sm font-medium text-slate-700" for={id}>
    {label}
    {#if required}<span class="text-rose-600">*</span>{/if}
  </label>
  <button
    id={id}
    type="button"
    class="flex w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm"
    aria-expanded={open}
    aria-label={startAriaLabel && endAriaLabel
      ? `${startAriaLabel} to ${endAriaLabel}`
      : label}
    onclick={openPicker}
  >
    <span>
      {#if hasRange}
        <span class="font-semibold text-slate-900">
          {formatBsDateRangePrimary(startDate, endDate)}
        </span>
        <span class="ml-2 text-xs text-slate-500">
          {formatAdDateRangeSecondary(startDate, endDate)}
        </span>
      {:else}
        <span class="text-slate-400">Select date range</span>
      {/if}
    </span>
    <span class="text-slate-400">{open ? '▲' : '▼'}</span>
  </button>
  <!-- Hidden fields keep form required semantics + stable test hooks. -->
  <input
    type="hidden"
    required={required}
    value={startDate}
    aria-label={startAriaLabel ?? `${label} start`}
  />
  <input
    type="hidden"
    required={required}
    value={endDate}
    aria-label={endAriaLabel ?? `${label} end`}
  />
  {#if open}
    <p class="text-xs text-slate-500" data-testid="range-picker-hint">{hint}</p>
    <div class="mt-2">
      <NepaliCalendar
        bsYear={anchorParts?.bsYear}
        bsMonth={anchorParts?.bsMonth}
        rangeStart={displayStart || null}
        rangeEnd={displayEnd || null}
        initialView="month"
        onSelect={handleSelect}
      />
    </div>
  {/if}
</div>
