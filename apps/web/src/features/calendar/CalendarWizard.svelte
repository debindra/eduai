<script lang="ts">
  import { onMount } from 'svelte';
  import TeachingDays from './TeachingDays.svelte';
  import {
    approveCalendar,
    getCalendarStatus,
    getFestivalTemplate,
    patchFestivalTemplate,
    setupCalendar,
  } from './api';
  import {
    isDraftCalendarAlreadyExistsError,
    isDraftCalendarNotFoundError,
    resolveWizardStepFromStatus,
    toIsoWeekday,
  } from './calendar-wizard-logic';
  import type { components } from '../../lib/shared/api/generated-types';

  type FestivalClosure = components['schemas']['FestivalTemplateResponse']['closures'][number];
  type ReportingType = components['schemas']['CalendarSetupRequest']['terminals'][number]['reportingType'];

  let step = $state(1);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let calendarId = $state<string | null>(null);
  let approvedYearLabel = $state<string | null>(null);

  let academicYearLabel = $state('2082/83');
  let sessionStart = $state('');
  let sessionEnd = $state('');
  /** JS weekday: 0=Sun … 6=Sat — converted to ISO 1–7 on submit */
  let weeklyOffDays = $state<number[]>([6]);
  let terminalName = $state('Terminal 1');
  let terminalStart = $state('');
  let terminalEnd = $state('');
  let reportingType = $state<ReportingType>('formative');

  let closures = $state<FestivalClosure[]>([]);

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

  const goToFestivals = () => {
    step = 2;
    void loadFestivals();
  };

  const handleSetup = async (event: SubmitEvent) => {
    event.preventDefault();
    loading = true;
    error = null;
    try {
      const response = await setupCalendar({
        academicYearLabel,
        sessionStart,
        sessionEnd,
        weeklyOffs: weeklyOffDays.map(toIsoWeekday),
        terminals: [
          {
            name: terminalName,
            sortOrder: 1,
            startDate: terminalStart,
            endDate: terminalEnd,
            reportingType,
          },
        ],
      });
      calendarId = response.schoolCalendarId;
      goToFestivals();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Setup failed';
      // Seed (and re-runs) may already have a draft — continue to festival review.
      if (isDraftCalendarAlreadyExistsError(message)) {
        error = null;
        goToFestivals();
      } else {
        error = message;
      }
    } finally {
      loading = false;
    }
  };

  const loadFestivals = async () => {
    loading = true;
    error = null;
    try {
      const response = await getFestivalTemplate();
      calendarId = response.schoolCalendarId;
      closures = response.closures;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load festival template';
      if (isDraftCalendarNotFoundError(message)) {
        const status = await getCalendarStatus();
        const resume = resolveWizardStepFromStatus(status);
        if (resume?.action === 'approved') {
          calendarId = resume.calendarId;
          approvedYearLabel = resume.academicYearLabel;
          step = 3;
          error = null;
          return;
        }
      }
      error = message;
    } finally {
      loading = false;
    }
  };

  const handleFestivalsContinue = async () => {
    loading = true;
    error = null;
    try {
      await patchFestivalTemplate({
        closures: closures.map(({ id, name, startDate, endDate }) => ({
          id,
          name,
          startDate,
          endDate,
        })),
      });
      step = 3;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Could not save closures';
    } finally {
      loading = false;
    }
  };

  const handleApprove = async () => {
    loading = true;
    error = null;
    try {
      const response = await approveCalendar();
      calendarId = response.schoolCalendarId;
      approvedYearLabel = academicYearLabel;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Approval failed';
    } finally {
      loading = false;
    }
  };

  onMount(async () => {
    loading = true;
    error = null;
    try {
      const status = await getCalendarStatus();
      const resume = resolveWizardStepFromStatus(status);
      if (resume?.action === 'festivals') {
        calendarId = resume.calendarId;
        step = 2;
        await loadFestivals();
        return;
      }
      if (resume?.action === 'approved') {
        calendarId = resume.calendarId;
        approvedYearLabel = resume.academicYearLabel;
        step = 3;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Could not load calendar status';
    } finally {
      loading = false;
    }
  });
</script>

<main class="mx-auto min-h-screen max-w-3xl px-4 py-12">
  <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
    <p class="text-sm font-medium uppercase tracking-wide text-emerald-700">Admin</p>
    <h1 class="mt-2 text-2xl font-semibold text-slate-900">School calendar wizard</h1>
    <p class="mt-2 text-sm text-slate-600">
      Step {step} of 3 — session dates, festival review, approve.
    </p>

    <ol class="mt-6 flex gap-2 text-xs font-medium">
      {#each ['Setup', 'Festivals', 'Approve'] as label, index (label)}
        <li
          class={`rounded-full px-3 py-1 ${step === index + 1 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          {index + 1}. {label}
        </li>
      {/each}
    </ol>

    {#if error}
      <p class="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
        {error}
      </p>
    {/if}

    {#if step === 1}
      {#if approvedYearLabel}
        <p class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          An approved calendar already exists for {approvedYearLabel}. Use a different academic year
          label below to create a new draft.
        </p>
      {/if}
      <form class="mt-6 space-y-4" onsubmit={handleSetup}>
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

        <div class="grid gap-4 sm:grid-cols-2">
          <div>
            <label for="sessionStart" class="block text-sm font-medium text-slate-700">
              Session start
            </label>
            <input
              id="sessionStart"
              type="date"
              required
              bind:value={sessionStart}
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label for="sessionEnd" class="block text-sm font-medium text-slate-700">
              Session end
            </label>
            <input
              id="sessionEnd"
              type="date"
              required
              bind:value={sessionEnd}
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

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

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="sm:col-span-2">
            <label for="terminalName" class="block text-sm font-medium text-slate-700">
              Terminal name
            </label>
            <input
              id="terminalName"
              type="text"
              required
              bind:value={terminalName}
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label for="terminalStart" class="block text-sm font-medium text-slate-700">
              Terminal start
            </label>
            <input
              id="terminalStart"
              type="date"
              required
              bind:value={terminalStart}
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label for="terminalEnd" class="block text-sm font-medium text-slate-700">
              Terminal end
            </label>
            <input
              id="terminalEnd"
              type="date"
              required
              bind:value={terminalEnd}
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div class="sm:col-span-2">
            <label for="reportingType" class="block text-sm font-medium text-slate-700">
              Reporting type
            </label>
            <select
              id="reportingType"
              required
              bind:value={reportingType}
              class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="formative">Formative</option>
              <option value="summative">Summative</option>
              <option value="transition">Transition</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? 'Saving…' : 'Continue to festivals'}
        </button>
      </form>
    {:else if step === 2}
      <div class="mt-6 space-y-3">
        {#if loading && closures.length === 0}
          <p class="text-sm text-slate-600">Loading festival template…</p>
        {:else}
          {#each closures as closure (closure.id)}
            <div class="space-y-2 rounded-lg border border-slate-200 px-3 py-3 text-sm">
              <label class="block">
                <span class="font-medium text-slate-900">Name</span>
                <input
                  type="text"
                  bind:value={closure.name}
                  class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <div class="grid gap-2 sm:grid-cols-2">
                <label class="block">
                  <span class="text-slate-600">Start</span>
                  <input
                    type="date"
                    bind:value={closure.startDate}
                    class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <label class="block">
                  <span class="text-slate-600">End</span>
                  <input
                    type="date"
                    bind:value={closure.endDate}
                    class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </div>
          {:else}
            <p class="text-sm text-slate-500">No festival closures in template.</p>
          {/each}

          <button
            type="button"
            disabled={loading}
            onclick={handleFestivalsContinue}
            class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Continue to approve'}
          </button>
        {/if}
      </div>
    {:else}
      <div class="mt-6 space-y-4">
        <p class="text-sm text-slate-600">
          {#if approvedYearLabel}
            Calendar for {approvedYearLabel} is approved.
          {:else}
            Approve the calendar when terminals and festival adjustments look correct.
          {/if}
          {#if calendarId}
            Calendar: <span class="font-mono text-xs">{calendarId}</span>
          {/if}
        </p>
        <button
          type="button"
          disabled={loading || approvedYearLabel !== null}
          onclick={handleApprove}
          class="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
        >
          {loading ? 'Approving…' : approvedYearLabel ? 'Already approved' : 'Approve calendar'}
        </button>
        <TeachingDays />
      </div>
    {/if}
  </div>
</main>
