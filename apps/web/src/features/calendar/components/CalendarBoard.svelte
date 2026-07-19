<script lang="ts">
  import NepaliCalendar from '../../shared/NepaliCalendar.svelte';
  import {
    formatAdDateRangeSecondary,
    formatBsDateRangePrimary,
  } from '../../shared/nepali-calendar-logic';
  import {
    buildMarkedDates,
    closureCategoryLabel,
    closureLegendItems,
    toneBadgeClass,
    type ClosureMarkerInput,
  } from '../calendar-markers-logic';
  import ClosureFormDialog, {
    type ClosureDialogDraft,
    type NationalDialogDraft,
    type SchoolDialogDraft,
  } from './ClosureFormDialog.svelte';
  import type { SchoolEcaCcaItem } from '../../eca-cca/eca-cca-logic';
  import type { LocalClosure } from '../calendar-wizard-logic';

  export type EditableNationalClosure = {
    id?: string;
    name: string;
    startDate: string;
    endDate: string;
    category: 'govt_holiday' | 'festival' | 'day_off';
    movable?: boolean;
    bsLabel?: string | null;
  };

  type Props = {
    bsYear: number;
    nationalClosures?: ClosureMarkerInput[];
    localClosures?: ClosureMarkerInput[];
    title?: string;
    readOnly?: boolean;
    /** When true, clicking a day opens the add/edit dialog. */
    editable?: boolean;
    /** Which list the dialog edits. Default school. */
    editKind?: 'school' | 'national';
    initialView?: 'year' | 'month';
    /** Bound school closures when editKind=school. */
    closures?: LocalClosure[];
    /** Bound national closures when editKind=national. */
    editableNationalClosures?: EditableNationalClosure[];
    /** Fired after school/national list mutates (national page can PATCH). */
    onClosuresChanged?: () => void;
    /** Session span + ISO weekdays (1=Mon…7=Sun) for weekly-off red markers. */
    sessionStart?: string | null;
    sessionEnd?: string | null;
    weeklyOffs?: number[];
    /** Active school ECA/CCA items for the closure dialog picker. */
    schoolActivities?: SchoolEcaCcaItem[];
  };

  let {
    bsYear,
    nationalClosures = [],
    localClosures = [],
    title,
    readOnly = false,
    editable = false,
    editKind = 'school',
    initialView = 'month',
    closures = $bindable([]),
    editableNationalClosures = $bindable([]),
    onClosuresChanged,
    sessionStart = null,
    sessionEnd = null,
    weeklyOffs = [],
    schoolActivities = [],
  }: Props = $props();

  const markerNational = $derived(
    editKind === 'national' && editable ? editableNationalClosures : nationalClosures,
  );
  const markerLocal = $derived(
    editKind === 'school' && editable
      ? closures
      : localClosures.length > 0
        ? localClosures
        : closures,
  );

  const weeklyOffMarkers = $derived(
    sessionStart && sessionEnd && weeklyOffs.length > 0
      ? { sessionStart, sessionEnd, isoWeekdays: weeklyOffs }
      : null,
  );

  const markedDates = $derived(
    buildMarkedDates(markerNational, markerLocal, weeklyOffMarkers),
  );
  const legend = $derived(
    closureLegendItems(markerNational, markerLocal, weeklyOffMarkers),
  );

  let dialogOpen = $state(false);
  let dialogDraft = $state<ClosureDialogDraft | null>(null);
  /** Index into the editable list when opening an existing row (avoids rename duplicates). */
  let editingIndex = $state<number | null>(null);

  const overlapsDay = (start: string, end: string, adIso: string) =>
    start <= adIso && end >= adIso;

  const openSchoolDialog = (adIso: string) => {
    const index = closures.findIndex((c) => overlapsDay(c.startDate, c.endDate, adIso));
    editingIndex = index >= 0 ? index : null;
    const existing = index >= 0 ? closures[index] : undefined;
    dialogDraft = existing
      ? {
          kind: 'school',
          id: existing.id,
          name: existing.name,
          startDate: existing.startDate,
          endDate: existing.endDate,
          category: existing.category ?? 'school_holiday',
          schoolActivityId: existing.schoolActivityId ?? null,
          iconKey: existing.iconKey ?? null,
        }
      : {
          kind: 'school',
          name: '',
          startDate: adIso,
          endDate: adIso,
          category: 'school_holiday',
          schoolActivityId: null,
          iconKey: null,
        };
    dialogOpen = true;
  };

  const openNationalDialog = (adIso: string) => {
    const index = editableNationalClosures.findIndex((c) =>
      overlapsDay(c.startDate, c.endDate, adIso),
    );
    editingIndex = index >= 0 ? index : null;
    const existing = index >= 0 ? editableNationalClosures[index] : undefined;
    dialogDraft = existing
      ? {
          kind: 'national',
          id: existing.id,
          name: existing.name,
          startDate: existing.startDate,
          endDate: existing.endDate,
          category: existing.category,
          movable: existing.movable ?? true,
        }
      : {
          kind: 'national',
          name: '',
          startDate: adIso,
          endDate: adIso,
          category: 'festival',
          movable: true,
        };
    dialogOpen = true;
  };

  const handleSelectDay = (adIso: string) => {
    if (!editable) return;
    if (editKind === 'national') openNationalDialog(adIso);
    else openSchoolDialog(adIso);
  };

  const notifyChanged = () => {
    onClosuresChanged?.();
  };

  const handleSave = (draft: ClosureDialogDraft) => {
    if (draft.kind === 'school') {
      saveSchool(draft);
    } else {
      saveNational(draft);
    }
    dialogOpen = false;
    dialogDraft = null;
    editingIndex = null;
    notifyChanged();
  };

  const saveSchool = (draft: SchoolDialogDraft) => {
    const next: LocalClosure = {
      id: draft.id,
      name: draft.name,
      startDate: draft.startDate,
      endDate: draft.endDate,
      category: draft.category,
      schoolActivityId: draft.schoolActivityId ?? null,
      iconKey: draft.iconKey ?? null,
    };
    if (editingIndex !== null && editingIndex >= 0) {
      closures = closures.map((c, i) => (i === editingIndex ? { ...c, ...next } : c));
      return;
    }
    if (draft.id) {
      closures = closures.map((c) => (c.id === draft.id ? { ...c, ...next } : c));
      return;
    }
    closures = [...closures, next];
  };

  const saveNational = (draft: NationalDialogDraft) => {
    const next: EditableNationalClosure = {
      id: draft.id,
      name: draft.name,
      startDate: draft.startDate,
      endDate: draft.endDate,
      category: draft.category,
      movable: draft.movable,
    };
    if (editingIndex !== null && editingIndex >= 0) {
      editableNationalClosures = editableNationalClosures.map((c, i) =>
        i === editingIndex ? { ...c, ...next } : c,
      );
      return;
    }
    if (draft.id) {
      editableNationalClosures = editableNationalClosures.map((c) =>
        c.id === draft.id ? { ...c, ...next } : c,
      );
      return;
    }
    editableNationalClosures = [...editableNationalClosures, next];
  };

  const handleDelete = () => {
    if (!dialogDraft) return;
    if (dialogDraft.kind === 'school') {
      if (editingIndex !== null && editingIndex >= 0) {
        closures = closures.filter((_, i) => i !== editingIndex);
      } else if (dialogDraft.id) {
        closures = closures.filter((c) => c.id !== dialogDraft?.id);
      }
    } else if (editingIndex !== null && editingIndex >= 0) {
      editableNationalClosures = editableNationalClosures.filter((_, i) => i !== editingIndex);
    } else if (dialogDraft.id) {
      editableNationalClosures = editableNationalClosures.filter((c) => c.id !== dialogDraft?.id);
    }
    dialogOpen = false;
    dialogDraft = null;
    editingIndex = null;
    notifyChanged();
  };

  const openLegendItem = (item: {
    source: string;
    name: string;
    startDate: string;
    category?: string;
  }) => {
    if (!editable) return;
    if (editKind === 'school' && item.source === 'local') {
      const index = closures.findIndex(
        (c) => c.name === item.name && c.startDate === item.startDate,
      );
      if (index < 0) return;
      editingIndex = index;
      const existing = closures[index]!;
      dialogDraft = {
        kind: 'school',
        id: existing.id,
        name: existing.name,
        startDate: existing.startDate,
        endDate: existing.endDate,
        category: existing.category ?? 'school_holiday',
      };
      dialogOpen = true;
      return;
    }
    if (editKind === 'national' && item.source === 'national') {
      const index = editableNationalClosures.findIndex(
        (c) => c.name === item.name && c.startDate === item.startDate,
      );
      if (index < 0) return;
      editingIndex = index;
      const existing = editableNationalClosures[index]!;
      dialogDraft = {
        kind: 'national',
        id: existing.id,
        name: existing.name,
        startDate: existing.startDate,
        endDate: existing.endDate,
        category: existing.category,
        movable: existing.movable ?? true,
      };
      dialogOpen = true;
    }
  };

  const legendEditable = (source: string) =>
    editable &&
    ((editKind === 'school' && source === 'local') ||
      (editKind === 'national' && source === 'national'));

  const hint = $derived(
    readOnly
      ? null
      : editable && editKind === 'national'
        ? 'Click a date to add or edit a national closure (govt holiday, festival, or day off).'
        : editable
          ? `Click a date to add a school holiday or ${closureCategoryLabel('eca')}. National closures are read-only.`
          : null,
  );
</script>

<section class="space-y-4" data-testid="calendar-board">
  {#if title}
    <div>
      <h2 class="text-lg font-semibold text-slate-900">{title}</h2>
      {#if hint}
        <p class="mt-0.5 text-xs text-slate-500">{hint}</p>
      {/if}
    </div>
  {/if}

  <NepaliCalendar
    {bsYear}
    {markedDates}
    {initialView}
    onSelect={editable ? handleSelectDay : undefined}
  />

  {#if legend.length > 0}
    <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 class="text-sm font-medium text-slate-800">Closures &amp; activities</h3>
      <ul class="mt-2 space-y-1.5 text-sm">
        {#each legend as item (`${item.source}-${item.name}-${item.startDate}`)}
          {@const categoryBadge =
            closureCategoryLabel(item.category) !== '—'
              ? closureCategoryLabel(item.category)
              : item.source}
          {@const bsRange = formatBsDateRangePrimary(item.startDate, item.endDate)}
          {@const adRange = formatAdDateRangeSecondary(item.startDate, item.endDate)}
          <li class="flex flex-wrap items-baseline gap-2">
            {#if legendEditable(item.source)}
              <button
                type="button"
                class="flex flex-wrap items-baseline gap-2 text-left"
                onclick={() => openLegendItem(item)}
              >
                <span
                  class={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${toneBadgeClass(item.tone)}`}
                >
                  {categoryBadge}
                </span>
                <span class="font-medium text-slate-900 underline-offset-2 hover:underline"
                  >{item.name}</span
                >
                <span class="text-xs font-medium text-slate-700">{bsRange}</span>
                <span class="text-xs text-slate-500">{adRange}</span>
              </button>
            {:else}
              <span
                class={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${toneBadgeClass(item.tone)}`}
              >
                {categoryBadge}
              </span>
              <span class="font-medium text-slate-900">{item.name}</span>
              <span class="text-xs font-medium text-slate-700">{bsRange}</span>
              <span class="text-xs text-slate-500">{adRange}</span>
            {/if}
          </li>
        {/each}
      </ul>
    </div>
  {:else}
    <p class="text-sm text-slate-500">
      {editable ? 'No closures yet — click a date on the calendar to add one.' : 'No closures to display.'}
    </p>
  {/if}
</section>

{#if dialogOpen && dialogDraft}
  <ClosureFormDialog
    draft={dialogDraft}
    schoolActivities={schoolActivities}
    onSave={handleSave}
    onCancel={() => {
      dialogOpen = false;
      dialogDraft = null;
      editingIndex = null;
    }}
    onDelete={dialogDraft.id || dialogDraft.name ? handleDelete : undefined}
  />
{/if}
