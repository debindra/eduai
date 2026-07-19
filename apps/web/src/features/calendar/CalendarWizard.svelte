<script lang="ts">
  import { onMount } from 'svelte';
  import AdminNav from '../shared/AdminNav.svelte';
  import Alert from '../shared/Alert.svelte';
  import { toErrorMessage } from '../../lib/shared/errors';
  import SetupStep from './components/SetupStep.svelte';
  import ClosuresStep from './components/ClosuresStep.svelte';
  import ApproveStep from './components/ApproveStep.svelte';
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
    type LocalClosure,
    type NationalClosure,
    type TerminalDraft,
  } from './calendar-wizard-logic';

  let step = $state(1);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let calendarId = $state<string | null>(null);
  let approvedYearLabel = $state<string | null>(null);

  let academicYearLabel = $state('2082/83');
  let sessionStart = $state('');
  let sessionEnd = $state('');
  let weeklyOffDays = $state<number[]>([6]);
  let terminals = $state<TerminalDraft[]>([
    {
      name: 'Terminal 1',
      startDate: '',
      endDate: '',
      reportingType: 'formative',
    },
  ]);

  let closures = $state<LocalClosure[]>([]);
  let nationalClosures = $state<NationalClosure[]>([]);
  let bsYear = $state<number | null>(null);

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
        terminals: terminals.map((terminal, index) => ({
          name: terminal.name,
          sortOrder: index + 1,
          startDate: terminal.startDate,
          endDate: terminal.endDate,
          reportingType: terminal.reportingType,
        })),
      });
      calendarId = response.schoolCalendarId;
      goToFestivals();
    } catch (err) {
      const message = toErrorMessage(err, 'Setup failed');
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
      bsYear = (response as { bsYear?: number }).bsYear ?? null;
      nationalClosures =
        (response as { nationalClosures?: NationalClosure[] }).nationalClosures ?? [];
      closures = response.closures.map((c) => ({
        id: c.id,
        name: c.name,
        startDate: c.startDate,
        endDate: c.endDate,
      }));
    } catch (err) {
      const message = toErrorMessage(err, 'Could not load festival template');
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
        closures: closures
          .filter((c) => c.name && c.startDate && c.endDate)
          .map(({ id, name, startDate, endDate }) => ({
            id,
            name,
            startDate,
            endDate,
          })),
      });
      step = 3;
    } catch (err) {
      error = toErrorMessage(err, 'Could not save closures');
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
      error = toErrorMessage(err, 'Approval failed');
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
      error = toErrorMessage(err, 'Could not load calendar status');
    } finally {
      loading = false;
    }
  });
</script>

<AdminNav />

<main class="mx-auto min-h-screen max-w-3xl px-4 py-12">
  <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
    <p class="text-sm font-medium uppercase tracking-wide text-emerald-700">Admin</p>
    <h1 class="mt-2 text-2xl font-semibold text-slate-900">School calendar wizard</h1>
    <p class="mt-2 text-sm text-slate-600">
      Step {step} of 3 — BS-primary dates, national + local closures, approve.
    </p>

    <ol class="mt-6 flex gap-2 text-xs font-medium">
      {#each ['Setup', 'Closures', 'Approve'] as label, index (label)}
        <li
          class={`rounded-full px-3 py-1 ${step === index + 1 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          {index + 1}. {label}
        </li>
      {/each}
    </ol>

    <Alert message={error} class="mt-4" />

    {#if step === 1}
      <SetupStep
        bind:academicYearLabel
        bind:sessionStart
        bind:sessionEnd
        bind:weeklyOffDays
        bind:terminals
        {loading}
        onSubmit={handleSetup}
      />
    {:else if step === 2}
      <ClosuresStep
        {bsYear}
        {nationalClosures}
        bind:closures
        {loading}
        onContinue={handleFestivalsContinue}
      />
    {:else}
      <ApproveStep {approvedYearLabel} {loading} onApprove={handleApprove} />
    {/if}
  </div>
</main>
