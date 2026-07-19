<script lang="ts">
  import NepaliDatePicker from '../../shared/NepaliDatePicker.svelte';
  import type { TerminalDraft } from '../calendar-wizard-logic';

  type Props = {
    academicYearLabel: string;
    sessionStart: string;
    sessionEnd: string;
    weeklyOffDays: number[];
    terminals: TerminalDraft[];
    loading: boolean;
    onSubmit: (event: SubmitEvent) => void;
  };

  let {
    academicYearLabel = $bindable(),
    sessionStart = $bindable(),
    sessionEnd = $bindable(),
    weeklyOffDays = $bindable(),
    terminals = $bindable(),
    loading,
    onSubmit,
  }: Props = $props();

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
        startDate: '',
        endDate: '',
        reportingType: 'formative',
      },
    ];
  };

  const removeTerminal = (index: number) => {
    if (terminals.length <= 1) return;
    terminals = terminals.filter((_, i) => i !== index);
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
      bind:value={academicYearLabel}
      class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
    />
  </div>

  <NepaliDatePicker
    id="sessionStart"
    label="Session start"
    required
    value={sessionStart}
    onChange={(v) => (sessionStart = v)}
  />
  <NepaliDatePicker
    id="sessionEnd"
    label="Session end"
    required
    value={sessionEnd}
    onChange={(v) => (sessionEnd = v)}
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
        <NepaliDatePicker
          label="Terminal start"
          required
          value={terminal.startDate}
          onChange={(v) => (terminal.startDate = v)}
        />
        <NepaliDatePicker
          label="Terminal end"
          required
          value={terminal.endDate}
          onChange={(v) => (terminal.endDate = v)}
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
    disabled={loading}
    class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
  >
    {loading ? 'Saving…' : 'Continue to closures'}
  </button>
</form>
