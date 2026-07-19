<script lang="ts">
  import { onMount } from 'svelte';
  import PlatformNav from '../shared/PlatformNav.svelte';
  import NepaliDatePicker from '../shared/NepaliDatePicker.svelte';
  import Alert from '../shared/Alert.svelte';
  import { toErrorMessage } from '../../lib/shared/errors';
  import {
    createNationalCalendar,
    listNationalCalendars,
    patchNationalClosures,
    publishNationalCalendar,
    type NationalCalendar,
  } from './api';
  import { buildClosurePayload, isClosureDraftComplete } from './national-calendar-logic';

  let calendars = $state<NationalCalendar[]>([]);
  let selectedId = $state<string | null>(null);
  let newBsYear = $state(2082);
  let error = $state<string | null>(null);
  let message = $state<string | null>(null);
  let draftName = $state('');
  let draftCategory = $state<'govt_holiday' | 'festival' | 'day_off'>('festival');
  let draftStart = $state('');
  let draftEnd = $state('');
  let draftMovable = $state(true);

  const selected = $derived(calendars.find((c) => c.id === selectedId) ?? null);

  const reload = async () => {
    const response = await listNationalCalendars();
    calendars = response.calendars;
    if (!selectedId && calendars[0]) selectedId = calendars[0].id;
  };

  onMount(async () => {
    try {
      await reload();
    } catch (err) {
      error = toErrorMessage(err, 'Failed to load');
    }
  });

  const handleCreate = async () => {
    error = null;
    message = null;
    try {
      const created = await createNationalCalendar(newBsYear);
      await reload();
      selectedId = created.id;
      message = `Draft BS ${created.bsYear} created`;
    } catch (err) {
      error = toErrorMessage(err, 'Create failed');
    }
  };

  const handleAddClosure = async () => {
    if (
      !selected ||
      !isClosureDraftComplete({ name: draftName, startDate: draftStart, endDate: draftEnd })
    ) {
      return;
    }
    error = null;
    try {
      await patchNationalClosures(
        selected.id,
        buildClosurePayload(selected.closures, {
          name: draftName,
          category: draftCategory,
          startDate: draftStart,
          endDate: draftEnd,
          movable: draftMovable,
        }),
      );
      draftName = '';
      draftStart = '';
      draftEnd = '';
      await reload();
      message = 'Closure saved';
    } catch (err) {
      error = toErrorMessage(err, 'Save failed');
    }
  };

  const handlePublish = async () => {
    if (!selected) return;
    error = null;
    try {
      await publishNationalCalendar(selected.id);
      await reload();
      message = 'Published — teaching_days will exclude these closures';
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
      Deterministic govt holidays / festivals / days off. Publishing reflows teaching_days for all schools.
    </p>
  </div>

  <Alert message={error} />
  <Alert variant="success" message={message} />

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

  <section class="grid gap-6 lg:grid-cols-2">
    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
              onclick={() => (selectedId = cal.id)}
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
    </div>

    <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 class="font-medium text-slate-900">Closures</h2>
      {#if selected}
        <ul class="mt-3 space-y-2 text-sm">
          {#each selected.closures as closure (closure.id)}
            <li class="rounded-lg border border-slate-100 px-3 py-2">
              <div class="font-medium text-slate-900">{closure.name}</div>
              <div class="text-xs text-slate-500">
                {closure.category} · {closure.startDate} → {closure.endDate}
                {#if closure.movable} · movable{/if}
              </div>
            </li>
          {/each}
        </ul>
        <div class="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <input
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Closure name"
            bind:value={draftName}
          />
          <select class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" bind:value={draftCategory}>
            <option value="festival">festival</option>
            <option value="govt_holiday">govt_holiday</option>
            <option value="day_off">day_off</option>
          </select>
          <NepaliDatePicker
            label="Start"
            value={draftStart}
            onChange={(v) => (draftStart = v)}
          />
          <NepaliDatePicker
            label="End"
            value={draftEnd}
            onChange={(v) => (draftEnd = v)}
          />
          <label class="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" bind:checked={draftMovable} />
            Movable festival
          </label>
          <button
            type="button"
            class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            onclick={handleAddClosure}
          >
            Add closure
          </button>
        </div>
      {:else}
        <p class="mt-3 text-sm text-slate-500">Select a calendar</p>
      {/if}
    </div>
  </section>
</main>
