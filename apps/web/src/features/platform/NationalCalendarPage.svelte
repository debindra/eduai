<script lang="ts">
  import { onMount } from 'svelte';
  import PlatformNav from '../shared/PlatformNav.svelte';
  import Alert from '../shared/Alert.svelte';
  import { toErrorMessage } from '../../lib/shared/errors';
  import {
    fromIsoWeekday,
    toIsoWeekday,
  } from '../calendar/calendar-wizard-logic';
  import {
    createNationalCalendar,
    listNationalCalendars,
    patchNationalClosures,
    patchNationalWeeklyOffs,
    publishNationalCalendar,
    type NationalCalendar,
    type NationalClosure,
  } from './api';
  import {
    buildClosuresReplacePayload,
    bsYearAdSessionSpan,
    normalizeIsoWeeklyOffs,
  } from './national-calendar-logic';
  import CalendarBoard, {
    type EditableNationalClosure,
  } from '../calendar/components/CalendarBoard.svelte';

  let calendars = $state<NationalCalendar[]>([]);
  let selectedId = $state<string | null>(null);
  let newBsYear = $state(2082);
  let error = $state<string | null>(null);
  let message = $state<string | null>(null);
  let workingClosures = $state<EditableNationalClosure[]>([]);
  /** JS getDay() values (0=Sun … 6=Sat) for checkbox UI. */
  let weeklyOffDays = $state<number[]>([6]);
  let saving = $state(false);

  const weekDays = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
  ] as const;

  const selected = $derived(calendars.find((c) => c.id === selectedId) ?? null);
  const canEdit = $derived(selected?.status === 'draft');
  const sessionSpan = $derived(
    selected ? bsYearAdSessionSpan(selected.bsYear) : null,
  );
  const weeklyOffsIso = $derived(weeklyOffDays.map(toIsoWeekday));

  const toWorking = (closures: NationalClosure[]): EditableNationalClosure[] =>
    closures.map((c) => ({
      id: c.id,
      name: c.name,
      startDate: c.startDate,
      endDate: c.endDate,
      category: c.category,
      movable: c.movable,
      bsLabel: c.bsLabel,
    }));

  const applyCalendarSelection = (cal: NationalCalendar | undefined) => {
    workingClosures = cal ? toWorking(cal.closures) : [];
    weeklyOffDays = (cal?.weeklyOffs?.length ? cal.weeklyOffs : [6]).map(fromIsoWeekday);
  };

  const reload = async () => {
    const response = await listNationalCalendars();
    calendars = response.calendars.map((c) => ({
      ...c,
      weeklyOffs: c.weeklyOffs ?? [6],
    }));
    if (!selectedId && calendars[0]) selectedId = calendars[0].id;
    applyCalendarSelection(calendars.find((c) => c.id === selectedId));
  };

  onMount(async () => {
    try {
      await reload();
    } catch (err) {
      error = toErrorMessage(err, 'Failed to load');
    }
  });

  const selectCalendar = (id: string) => {
    selectedId = id;
    applyCalendarSelection(calendars.find((c) => c.id === id));
    message = null;
    error = null;
  };

  const toggleWeeklyOff = (day: number) => {
    weeklyOffDays = weeklyOffDays.includes(day)
      ? weeklyOffDays.filter((value) => value !== day)
      : [...weeklyOffDays, day].sort();
  };

  const handleCreate = async () => {
    error = null;
    message = null;
    try {
      const created = await createNationalCalendar(newBsYear);
      await reload();
      selectedId = created.id;
      applyCalendarSelection({ ...created, weeklyOffs: created.weeklyOffs ?? [6] });
      message = `Draft BS ${created.bsYear} created`;
    } catch (err) {
      error = toErrorMessage(err, 'Create failed');
    }
  };

  const persistClosures = async () => {
    if (!selected || !canEdit) return;
    error = null;
    saving = true;
    try {
      await patchNationalClosures(
        selected.id,
        buildClosuresReplacePayload(workingClosures),
      );
      await reload();
      message = 'Closures saved';
    } catch (err) {
      error = toErrorMessage(err, 'Save failed');
    } finally {
      saving = false;
    }
  };

  const persistWeeklyOffs = async () => {
    if (!selected || !canEdit) return;
    error = null;
    saving = true;
    try {
      await patchNationalWeeklyOffs(
        selected.id,
        normalizeIsoWeeklyOffs(weeklyOffsIso),
      );
      await reload();
      message =
        'Weekly day-off preset saved. Schools inherit this at calendar setup; admins can change it later.';
    } catch (err) {
      error = toErrorMessage(err, 'Failed to save weekly offs');
    } finally {
      saving = false;
    }
  };

  const handlePublish = async () => {
    if (!selected) return;
    error = null;
    try {
      await publishNationalCalendar(selected.id);
      await reload();
      message = 'Published — closures and weekly-off preset available to schools';
    } catch (err) {
      error = toErrorMessage(err, 'Publish failed');
    }
  };
</script>

<PlatformNav />
<main class="mx-auto max-w-6xl space-y-6 px-4 py-8">
  <div>
    <h1 class="text-2xl font-semibold text-slate-900">National calendar</h1>
    <p class="mt-1 text-sm text-slate-600">
      Govt holidays, festivals, days off, and a national weekly day-off preset. Click a date on the
      board to add or edit closures. Publishing makes the preset available when schools set up their
      calendars (they can override later).
    </p>
  </div>

  <Alert message={error} />
  <Alert variant="success" message={message} />
  {#if saving}
    <p class="text-sm text-slate-500">Saving…</p>
  {/if}

  <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h2 class="font-medium text-slate-900">Create draft year</h2>
    <div class="mt-3 flex flex-wrap items-end gap-3">
      <label class="text-sm">
        BS year
        <input
          type="number"
          class="mt-1 block rounded-lg border border-slate-300 px-3 py-2"
          bind:value={newBsYear}
          min={2082}
        />
      </label>
      <button
        type="button"
        class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        onclick={handleCreate}
      >
        Create draft
      </button>
    </div>
  </section>

  <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h2 class="font-medium text-slate-900">Calendars</h2>
    <ul class="mt-3 space-y-2">
      {#each calendars as cal (cal.id)}
        <li>
          <button
            type="button"
            class={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
              selectedId === cal.id
                ? 'border-violet-500 bg-violet-50'
                : 'border-slate-200 hover:bg-slate-50'
            }`}
            onclick={() => selectCalendar(cal.id)}
          >
            BS {cal.bsYear}
            <span class="ml-2 text-xs uppercase text-slate-500">{cal.status}</span>
            <span class="ml-2 text-xs text-slate-400">{cal.closures.length} closures</span>
          </button>
        </li>
      {/each}
    </ul>
    {#if selected}
      <button
        type="button"
        class="mt-4 rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={selected.status === 'published'}
        onclick={handlePublish}
      >
        Publish
      </button>
    {/if}
  </section>

  {#if selected && sessionSpan}
    <section
      class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      data-testid="national-weekly-offs"
    >
      <h2 class="font-medium text-slate-900">Weekly day off (national preset)</h2>
      <p class="mt-1 text-sm text-slate-600">
        Shown in red on the monthly board. Schools copy this when they set up a calendar; school or
        tenant admins can change their own weekly offs later.
      </p>
      <fieldset class="mt-4" disabled={!canEdit}>
        <legend class="sr-only">Weekly off days</legend>
        <div class="flex flex-wrap gap-2">
          {#each weekDays as day (day.value)}
            <label
              class="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
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
      {#if canEdit}
        <button
          type="button"
          class="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          disabled={saving}
          onclick={persistWeeklyOffs}
          data-testid="national-weekly-offs-save"
        >
          Save weekly day offs
        </button>
      {/if}
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <CalendarBoard
        bsYear={selected.bsYear}
        title={`National calendar BS ${selected.bsYear}`}
        editKind="national"
        editable={canEdit}
        readOnly={!canEdit}
        initialView="month"
        sessionStart={sessionSpan.sessionStart}
        sessionEnd={sessionSpan.sessionEnd}
        weeklyOffs={weeklyOffsIso}
        bind:editableNationalClosures={workingClosures}
        onClosuresChanged={persistClosures}
      />
    </section>
  {/if}
</main>
