<script lang="ts">
  import NepaliDatePicker from '../../shared/NepaliDatePicker.svelte';
  import type { SchoolClosureCategory } from '../calendar-wizard-logic';
  import { ECA_CCA_LABEL } from '../calendar-markers-logic';

  export type SchoolDialogDraft = {
    kind: 'school';
    id?: string;
    name: string;
    startDate: string;
    endDate: string;
    category: SchoolClosureCategory;
  };

  export type NationalDialogDraft = {
    kind: 'national';
    id?: string;
    name: string;
    startDate: string;
    endDate: string;
    category: 'govt_holiday' | 'festival' | 'day_off';
    movable: boolean;
  };

  export type ClosureDialogDraft = SchoolDialogDraft | NationalDialogDraft;

  type Props = {
    draft: ClosureDialogDraft;
    onSave: (draft: ClosureDialogDraft) => void;
    onCancel: () => void;
    onDelete?: () => void;
  };

  let { draft, onSave, onCancel, onDelete }: Props = $props();

  let name = $state('');
  let startDate = $state('');
  let endDate = $state('');
  let schoolCategory = $state<SchoolClosureCategory>('school_holiday');
  let nationalCategory = $state<'govt_holiday' | 'festival' | 'day_off'>('festival');
  let movable = $state(true);

  $effect(() => {
    name = draft.name;
    startDate = draft.startDate;
    endDate = draft.endDate;
    if (draft.kind === 'school') {
      // ECA and CCA are the same UI type — normalize to eca for the select.
      schoolCategory = draft.category === 'cca' ? 'eca' : draft.category;
    } else {
      nationalCategory = draft.category;
      movable = draft.movable;
    }
  });

  const canSave = $derived(
    name.trim().length > 0 && Boolean(startDate) && Boolean(endDate) && endDate >= startDate,
  );

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    if (!canSave) return;
    if (draft.kind === 'school') {
      onSave({
        kind: 'school',
        id: draft.id,
        name: name.trim(),
        startDate,
        endDate,
        category: schoolCategory,
      });
    } else {
      onSave({
        kind: 'national',
        id: draft.id,
        name: name.trim(),
        startDate,
        endDate,
        category: nationalCategory,
        movable,
      });
    }
  };
</script>

<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
  data-testid="closure-form-dialog"
  role="dialog"
  aria-modal="true"
  aria-labelledby="closure-dialog-title"
  tabindex="-1"
  onclick={(e) => {
    if (e.target === e.currentTarget) onCancel();
  }}
  onkeydown={(e) => {
    if (e.key === 'Escape') onCancel();
  }}
>
  <form
    class="w-full max-w-md space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg"
    onsubmit={handleSubmit}
  >
    <h2 id="closure-dialog-title" class="text-lg font-semibold text-slate-900">
      {draft.id || draft.name ? 'Edit' : 'Add'}
      {draft.kind === 'national' ? ' national closure' : ' school date'}
    </h2>

    <label class="block text-sm text-slate-700">
      Name
      <input
        class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        bind:value={name}
        placeholder="e.g. Dashain"
        required
      />
    </label>

    <label class="block text-sm text-slate-700">
      Type
      {#if draft.kind === 'school'}
        <select
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          bind:value={schoolCategory}
        >
          <option value="school_holiday">School holiday</option>
          <option value="eca">{ECA_CCA_LABEL}</option>
        </select>
      {:else}
        <select
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          bind:value={nationalCategory}
        >
          <option value="festival">Festival</option>
          <option value="govt_holiday">Government holiday</option>
          <option value="day_off">Day off</option>
        </select>
      {/if}
    </label>

    <NepaliDatePicker label="Start" value={startDate} onChange={(v) => (startDate = v)} />
    <NepaliDatePicker label="End" value={endDate} onChange={(v) => (endDate = v)} />

    {#if draft.kind === 'national'}
      <label class="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" bind:checked={movable} />
        Movable festival
      </label>
    {/if}

    <div class="flex flex-wrap items-center justify-between gap-2 pt-2">
      <div>
        {#if onDelete && (draft.id || draft.name)}
          <button
            type="button"
            class="text-sm text-rose-700 hover:underline"
            onclick={onDelete}
          >
            Remove
          </button>
        {/if}
      </div>
      <div class="flex gap-2">
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          onclick={onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSave}
          class="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  </form>
</div>
