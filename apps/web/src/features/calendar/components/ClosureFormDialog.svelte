<script lang="ts">
  import NepaliDatePicker from '../../shared/NepaliDatePicker.svelte';
  import { iconGlyph } from '../../eca-cca/eca-cca-icons';
  import type { SchoolEcaCcaItem } from '../../eca-cca/eca-cca-logic';
  import { draftFromActivity } from '../../eca-cca/eca-cca-logic';
  import type { SchoolClosureCategory } from '../calendar-wizard-logic';
  import { ECA_CCA_LABEL } from '../calendar-markers-logic';

  export type SchoolDialogDraft = {
    kind: 'school';
    id?: string;
    name: string;
    startDate: string;
    endDate: string;
    category: SchoolClosureCategory;
    schoolActivityId?: string | null;
    iconKey?: string | null;
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
    /** Active school ECA/CCA items for the activity picker. */
    schoolActivities?: SchoolEcaCcaItem[];
    onSave: (draft: ClosureDialogDraft) => void;
    onCancel: () => void;
    onDelete?: () => void;
  };

  let { draft, schoolActivities = [], onSave, onCancel, onDelete }: Props = $props();

  let name = $state('');
  let startDate = $state('');
  let endDate = $state('');
  let schoolCategory = $state<SchoolClosureCategory>('school_holiday');
  let nationalCategory = $state<'govt_holiday' | 'festival' | 'day_off'>('festival');
  let movable = $state(true);
  let schoolActivityId = $state<string>('');

  $effect(() => {
    name = draft.name;
    startDate = draft.startDate;
    endDate = draft.endDate;
    if (draft.kind === 'school') {
      schoolCategory = draft.category === 'cca' ? 'eca' : draft.category;
      schoolActivityId = draft.schoolActivityId ?? '';
    } else {
      nationalCategory = draft.category;
      movable = draft.movable;
    }
  });

  const isEcaType = $derived(schoolCategory === 'eca' || schoolCategory === 'cca');

  const canSave = $derived(
    name.trim().length > 0 && Boolean(startDate) && Boolean(endDate) && endDate >= startDate,
  );

  const selectActivity = (itemId: string) => {
    schoolActivityId = itemId;
    if (!itemId) return;
    const item = schoolActivities.find((a) => a.id === itemId);
    if (!item) return;
    const mapped = draftFromActivity(item);
    name = mapped.name;
    schoolCategory = mapped.category === 'cca' ? 'eca' : mapped.category;
  };

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    if (!canSave) return;
    if (draft.kind === 'school') {
      const item = schoolActivities.find((a) => a.id === schoolActivityId);
      onSave({
        kind: 'school',
        id: draft.id,
        name: name.trim(),
        startDate,
        endDate,
        category: isEcaType && item ? item.kind : schoolCategory,
        schoolActivityId: isEcaType && schoolActivityId ? schoolActivityId : null,
        iconKey: isEcaType && item ? item.iconKey : null,
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
      Type
      {#if draft.kind === 'school'}
        <select
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          bind:value={schoolCategory}
          onchange={(e) => {
            if ((e.currentTarget as HTMLSelectElement).value === 'school_holiday') {
              schoolActivityId = '';
            }
          }}
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

    {#if draft.kind === 'school' && isEcaType && schoolActivities.length > 0}
      <label class="block text-sm text-slate-700">
        Activity
        <select
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          value={schoolActivityId}
          onchange={(e) => selectActivity((e.currentTarget as HTMLSelectElement).value)}
          data-testid="activity-picker"
        >
          <option value="">Free-text (no catalog link)</option>
          {#each schoolActivities as item (item.id)}
            <option value={item.id}>
              {iconGlyph(item.iconKey)} — {item.name} ({item.kind})
            </option>
          {/each}
        </select>
      </label>
    {/if}

    <label class="block text-sm text-slate-700">
      Name
      <input
        class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        bind:value={name}
        placeholder="e.g. Dashain"
        required
      />
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
