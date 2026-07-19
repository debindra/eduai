<script lang="ts">
  import {
    WEEKDAY_LABELS_SHORT,
    buildMonthGrid,
    formatAdSecondary,
    formatBsDayDevanagari,
    formatBsHeading,
    shiftMonthInYear,
    todayBsParts,
    bsMonthName,
    type CalendarViewMode,
  } from './nepali-calendar-logic';
  import { untrack } from 'svelte';

  type MarkerTone = 'red' | 'amber' | 'violet' | 'green';

  type DateMarker = {
    label: string;
    tone: MarkerTone;
  };

  type Props = {
    /** Controlled BS year (defaults to today). */
    bsYear?: number;
    /** Controlled BS month 1–12 when in month view. */
    bsMonth?: number;
    /** Selected AD ISO date (YYYY-MM-DD) — emitted on day click. */
    value?: string | null;
    /** Overlay markers keyed by AD ISO date. */
    markedDates?: Record<string, DateMarker | string>;
    /** Start in year overview or month view (default: current month). */
    initialView?: CalendarViewMode;
    onSelect?: (adIso: string) => void;
  };

  let {
    bsYear: bsYearProp,
    bsMonth: bsMonthProp,
    value = null,
    markedDates = {},
    initialView = 'month',
    onSelect,
  }: Props = $props();

  const today = todayBsParts();
  let viewMode = $state<CalendarViewMode>(untrack(() => initialView));
  let bsYear = $state(untrack(() => bsYearProp ?? today.bsYear));
  /** Prefer explicit month; otherwise open on the current BS month. */
  let bsMonth = $state(untrack(() => bsMonthProp ?? today.bsMonth));

  $effect(() => {
    if (bsYearProp !== undefined) bsYear = bsYearProp;
  });
  $effect(() => {
    if (bsMonthProp !== undefined) bsMonth = bsMonthProp;
  });

  const monthGrid = $derived(buildMonthGrid(bsYear, bsMonth));
  const heading = $derived(formatBsHeading(bsYear, bsMonth));

  const resolveMarker = (raw: DateMarker | string | undefined): DateMarker | null => {
    if (!raw) return null;
    if (typeof raw === 'string') return { label: raw, tone: 'amber' };
    return raw;
  };

  const ringClass = (tone: MarkerTone): string => {
    switch (tone) {
      case 'red':
        return 'ring-1 ring-rose-400';
      case 'amber':
        return 'ring-1 ring-amber-300';
      case 'violet':
        return 'ring-1 ring-violet-400';
      case 'green':
        return 'ring-1 ring-emerald-400';
    }
  };

  const labelClass = (tone: MarkerTone): string => {
    switch (tone) {
      case 'red':
        return 'text-rose-700';
      case 'amber':
        return 'text-amber-700';
      case 'violet':
        return 'text-violet-700';
      case 'green':
        return 'text-emerald-700';
    }
  };

  const handlePrev = () => {
    const next = shiftMonthInYear(bsYear, bsMonth, -1);
    if (next.changed) bsMonth = next.bsMonth;
  };

  const handleNext = () => {
    const next = shiftMonthInYear(bsYear, bsMonth, 1);
    if (next.changed) bsMonth = next.bsMonth;
  };

  const handleSelectMonth = (month: number) => {
    bsMonth = month;
    viewMode = 'month';
  };

  const handleBackToYear = () => {
    viewMode = 'year';
  };

  const handleDayClick = (adIso: string) => {
    if (!adIso) return;
    onSelect?.(adIso);
  };
</script>

<div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-testid="nepali-calendar">
  {#if viewMode === 'year'}
    <div class="mb-4 flex items-center justify-between">
      <h2 class="text-lg font-semibold text-slate-900">BS {bsYear}</h2>
      <p class="text-xs text-slate-500">12-month overview — select a month</p>
    </div>
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {#each Array.from({ length: 12 }, (_, i) => i + 1) as month (month)}
        <button
          type="button"
          class="rounded-xl border border-slate-200 px-3 py-4 text-left transition hover:border-emerald-400 hover:bg-emerald-50"
          aria-label={`Open ${bsMonthName(month)} ${bsYear}`}
          onclick={() => handleSelectMonth(month)}
        >
          <div class="text-base font-semibold text-slate-900">{bsMonthName(month)}</div>
          <div class="text-xs text-slate-500">BS {bsYear}</div>
        </button>
      {/each}
    </div>
  {:else}
    <div class="mb-3 flex items-center justify-between gap-2">
      <button
        type="button"
        class="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
        onclick={handleBackToYear}
      >
        ← Year
      </button>
      <div class="text-center">
        <div class="text-lg font-semibold text-slate-900">{heading}</div>
        <div class="text-xs text-slate-500">AD dates shown secondary</div>
      </div>
      <div class="flex gap-1">
        <button
          type="button"
          class="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          aria-label="Previous month"
          disabled={bsMonth <= 1}
          onclick={handlePrev}
        >
          ‹
        </button>
        <button
          type="button"
          class="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          aria-label="Next month"
          disabled={bsMonth >= 12}
          onclick={handleNext}
        >
          ›
        </button>
      </div>
    </div>

    <div class="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-500">
      {#each WEEKDAY_LABELS_SHORT as label (label)}
        <div class="py-1">{label}</div>
      {/each}
    </div>
    <div class="grid grid-cols-7 gap-1">
      {#each monthGrid as cell, idx (idx)}
        {@const marker = resolveMarker(markedDates[cell.adIso])}
        {#if cell.isOutsideMonth}
          <div class="min-h-14 rounded-lg bg-transparent"></div>
        {:else}
          <button
            type="button"
            class={`min-h-14 rounded-lg border px-1 py-1 text-left transition ${
              value === cell.adIso
                ? 'border-emerald-500 bg-emerald-50'
                : 'border-slate-100 hover:border-slate-300'
            } ${marker ? ringClass(marker.tone) : ''}`}
            aria-label={`Select ${cell.adIso}`}
            data-tone={marker?.tone}
            onclick={() => handleDayClick(cell.adIso)}
          >
            <div class="text-base font-semibold leading-tight text-slate-900">
              {formatBsDayDevanagari(cell.bsDay)}
            </div>
            <div class="text-[10px] leading-tight text-slate-500">
              {formatAdSecondary(cell.adIso)}
            </div>
            {#if marker}
              <div class={`mt-0.5 truncate text-[9px] ${labelClass(marker.tone)}`}>
                {marker.label}
              </div>
            {/if}
          </button>
        {/if}
      {/each}
    </div>
  {/if}
</div>
