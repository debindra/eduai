<script lang="ts">
  import NepaliDateRangePicker from '../../shared/NepaliDateRangePicker.svelte';
  import {
    nationalMatchMessage,
    nationalMatchStatus,
    resolveTargetBsYear,
    sessionBsYearMismatch,
    type TerminalDraft,
  } from '../calendar-wizard-logic';

  type Props = {
    academicYearLabel: string;
    sessionStart: string;
    sessionEnd: string;
    weeklyOffDays: number[];
    terminals: TerminalDraft[];
    loading: boolean;
    submitLabel?: string;
    /** Published national calendar BS years (for match chip). */
    publishedYears?: number[];
    onSubmit: (event: SubmitEvent) => void;
    /** Fired when academic year label changes (parent refreshes weekly-off preset). */
    onAcademicYearChange?: (label: string) => void;
  };

  let {
    academicYearLabel = $bindable(),
    sessionStart = $bindable(),
    sessionEnd = $bindable(),
    weeklyOffDays = $bindable(),
    terminals = $bindable(),
    loading,
    submitLabel = 'Continue to closures',
    publishedYears = [],
    onSubmit,
    onAcademicYearChange,
  }: Props = $props();

  const targetBsYear = $derived(resolveTargetBsYear(academicYearLabel));
  const matchStatus = $derived(
    nationalMatchStatus({ targetBsYear, publishedYears }),
  );
  const matchMessage = $derived(nationalMatchMessage(matchStatus, targetBsYear));
  const sessionMismatch = $derived(sessionBsYearMismatch(sessionStart, targetBsYear));

  const weekDays = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
  ];

  const toggleWeeklyOff = (day: number) => {
    weeklyOffDays = weeklyOffDays.includes(day)
      ? weeklyOffDays.filter((value) => value !== day)
      : [...weeklyOffDays, day].sort();
  };

  const addTerminal = () => {
    terminals = [
      ...terminals,
      {
        name: `Terminal ${terminals.length + 1}`,
        startDate: sessionStart,
        endDate: sessionEnd,
        reportingType: 'formative',
      },
    ];
  };

  const removeTerminal = (index: number) => {
    if (terminals.length <= 1) return;
    terminals = terminals.filter((_, i) => i !== index);
  };

  const handleYearInput = (event: Event) => {
    const value = (event.currentTarget as HTMLInputElement).value;
    academicYearLabel = value;
    onAcademicYearChange?.(value);
  };

  const setSessionRange = (range: { startDate: string; endDate: string }) => {
    sessionStart = range.startDate;
    sessionEnd = range.endDate;
  };

  const setTerminalRange = (
    index: number,
    range: { startDate: string; endDate: string },
  ) => {
    terminals = terminals.map((terminal, i) =>
      i === index
        ? { ...terminal, startDate: range.startDate, endDate: range.endDate }
        : terminal,
    );
  };
</script>

<form class="mt-6 space-y-4" onsubmit={onSubmit}>
  <div>
    <label for="yearLabel" class="block text-sm font-medium text-slate-700">
      Academic year label
    </label>
    <input
      id="yearLabel"
      type="text"
      required
      value={academicYearLabel}
      oninput={handleYearInput}
      class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      data-testid="setup-academic-year"
    />
    {#if matchMessage}
      <p
        class={`mt-2 rounded-lg px-3 py-2 text-sm ${
          matchStatus === 'matched'
            ? 'border border-emerald-200 bg-emerald-50 text-emerald-900'
            : 'border border-amber-200 bg-amber-50 text-amber-900'
        }`}
        role="status"
        data-testid="setup-national-match"
      >
        {matchMessage}
      </p>
    {/if}
    {#if sessionMismatch}
      <p
        class="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900"
        role="alert"
        data-testid="setup-session-mismatch"
      >
        Session start falls in a different BS year than the academic year label. Align them so
        national holidays apply correctly.
      </p>
    {/if}
  </div>

  <NepaliDateRangePicker
    id="sessionDates"
    label="Session dates"
    required
    startDate={sessionStart}
    endDate={sessionEnd}
    startAriaLabel="Session start"
    endAriaLabel="Session end"
    onChange={setSessionRange}
  />

  <fieldset>
    <legend class="text-sm font-medium text-slate-700">Weekly off days</legend>
    <div class="mt-2 flex flex-wrap gap-2">
      {#each weekDays as day (day.value)}
        <label class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <input
            type="checkbox"
            checked={weeklyOffDays.includes(day.value)}
            onchange={() => toggleWeeklyOff(day.value)}
          />
          {day.label}
        </label>
      {/each}
    </div>
  </fieldset>

  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-medium text-slate-700">Terminals</h2>
      <button type="button" class="text-sm font-medium text-emerald-700" onclick={addTerminal}>
        + Add terminal
      </button>
    </div>
    {#each terminals as terminal, index (index)}
      <div class="space-y-3 rounded-xl border border-slate-200 p-4">
        <div class="flex items-center justify-between">
          <input
            type="text"
            required
            bind:value={terminal.name}
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            aria-label={`Terminal ${index + 1} name`}
          />
          {#if terminals.length > 1}
            <button
              type="button"
              class="ml-2 text-xs text-rose-700"
              onclick={() => removeTerminal(index)}
            >
              Remove
            </button>
          {/if}
        </div>
        <NepaliDateRangePicker
          label={`Terminal ${index + 1} dates`}
          required
          startDate={terminal.startDate}
          endDate={terminal.endDate}
          startAriaLabel="Terminal start"
          endAriaLabel="Terminal end"
          onChange={(range) => setTerminalRange(index, range)}
        />
        <select
          required
          bind:value={terminal.reportingType}
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          aria-label={`Terminal ${index + 1} reporting type`}
        >
          <option value="formative">Formative</option>
          <option value="summative">Summative</option>
          <option value="transition">Transition</option>
        </select>
      </div>
    {/each}
  </div>

  <button
    type="submit"
    disabled={loading || sessionMismatch}
    class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
  >
    {loading ? 'Saving…' : submitLabel}
  </button>
</form>
