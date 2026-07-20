<script lang="ts">
  import { onMount } from 'svelte';
  import { push } from '@keenmate/svelte-spa-router';
  import PlatformNav from '../shared/PlatformNav.svelte';
  import Alert from '../shared/Alert.svelte';
  import SetupStep from '../calendar/components/SetupStep.svelte';
  import ClosuresStep from '../calendar/components/ClosuresStep.svelte';
  import ApproveStep from '../calendar/components/ApproveStep.svelte';
  import { ECA_CCA_LABEL } from '../calendar/calendar-markers-logic';
  import {
    defaultAcademicYearLabel,
    defaultFirstTerminal,
    defaultSessionBoundsFromLabel,
    applySessionBoundsToTerminals,
    fromIsoWeekday,
    resolveTargetBsYear,
    toIsoWeekday,
    type LocalClosure,
    type NationalClosure,
    type TerminalDraft,
  } from '../calendar/calendar-wizard-logic';
  import { toErrorMessage } from '../../lib/shared/errors';
  import {
    approvePlatformSchoolCalendar,
    ensurePlatformSchoolCalendarDraft,
    getPlatformSchoolCalendarClosures,
    getPlatformSchoolTeachingDays,
    listNationalCalendars,
    listPlatformSchools,
    patchPlatformSchoolCalendarClosures,
    setupPlatformSchoolCalendar,
    updatePlatformSchoolCalendarSetup,
  } from './api';
  import { formatApprovedAcademicCalendarTitle } from './platform-logic';

  type Props = {
    /** Passed by @keenmate/svelte-spa-router for `:schoolId` routes. */
    routeParams?: { schoolId?: string };
  };

  let { routeParams = {} }: Props = $props();

  const schoolId = $derived(routeParams.schoolId ?? '');

  type WizardStep = 1 | 2 | 3;

  let schoolName = $state<string | null>(null);
  let step = $state<WizardStep>(1);
  let calendarReadOnly = $state(false);
  let hasLiveApproved = $state(false);
  let hasDraft = $state(false);
  let loading = $state(true);
  let submitting = $state(false);
  let error = $state<string | null>(null);
  let successMessage = $state<string | null>(null);
  let approvedYearLabel = $state<string | null>(null);

  let academicYearLabel = $state(defaultAcademicYearLabel());
  const initialSession = defaultSessionBoundsFromLabel(academicYearLabel);
  let sessionStart = $state(initialSession?.sessionStart ?? '');
  let sessionEnd = $state(initialSession?.sessionEnd ?? '');
  let weeklyOffDays = $state<number[]>([6]);
  let publishedYears = $state<number[]>([]);
  let terminals = $state<TerminalDraft[]>(
    initialSession
      ? [defaultFirstTerminal(initialSession)]
      : [{ name: 'Terminal 1', startDate: '', endDate: '', reportingType: 'formative' }],
  );

  let bsYear = $state<number | null>(null);
  let nationalClosures = $state<NationalClosure[]>([]);
  let closures = $state<LocalClosure[]>([]);

  const exitToTenants = async () => {
    await push('/platform/schools');
  };

  const loadPublishedYears = async () => {
    try {
      const { calendars } = await listNationalCalendars();
      publishedYears = calendars
        .filter((c) => c.status === 'published')
        .map((c) => c.bsYear);
    } catch {
      publishedYears = [];
    }
  };

  const applySessionDefaultsFromLabel = (label: string) => {
    const bounds = defaultSessionBoundsFromLabel(label);
    if (!bounds) return;
    sessionStart = bounds.sessionStart;
    sessionEnd = bounds.sessionEnd;
    terminals = applySessionBoundsToTerminals(terminals, bounds, {
      syncSingleTerminal: true,
    });
  };

  /** Prefill setup weekly offs from published national calendar for exact BS year only. */
  const applyNationalWeeklyPreset = async (label: string) => {
    applySessionDefaultsFromLabel(label);
    const year = resolveTargetBsYear(label);
    if (year == null) return;
    try {
      const { calendars } = await listNationalCalendars();
      publishedYears = calendars
        .filter((c) => c.status === 'published')
        .map((c) => c.bsYear);
      const published = calendars.find(
        (c) => c.status === 'published' && c.bsYear === year,
      );
      if (published?.weeklyOffs?.length) {
        weeklyOffDays = published.weeklyOffs.map(fromIsoWeekday);
      }
    } catch {
      // Keep default Saturday when national calendar is unavailable.
    }
  };

  const hydrateFromClosures = (
    response: Awaited<ReturnType<typeof getPlatformSchoolCalendarClosures>>,
  ) => {
    bsYear = response.bsYear ?? null;
    if (response.academicYearLabel) academicYearLabel = response.academicYearLabel;
    if (response.sessionStart) sessionStart = response.sessionStart;
    if (response.sessionEnd) sessionEnd = response.sessionEnd;
    if (response.weeklyOffs && response.weeklyOffs.length > 0) {
      weeklyOffDays = response.weeklyOffs.map(fromIsoWeekday);
    }
    if (response.terminals?.length) {
      terminals = response.terminals.map((t) => ({
        name: t.name,
        startDate: t.startDate,
        endDate: t.endDate,
        reportingType: t.reportingType ?? 'formative',
      }));
    }
    nationalClosures = (response.nationalClosures ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      startDate: c.startDate,
      endDate: c.endDate,
      category: c.category,
    }));
    closures = (response.closures ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      startDate: c.startDate,
      endDate: c.endDate,
      category: c.category ?? 'school_holiday',
    }));
  };

  const loadClosures = async (opts?: {
    readOnly?: boolean;
    message?: string | null;
    goToStep?: WizardStep;
  }) => {
    const response = await getPlatformSchoolCalendarClosures(schoolId);
    hydrateFromClosures(response);
    const approved =
      opts?.readOnly !== undefined
        ? opts.readOnly
        : response.approvalStatus === 'approved';
    calendarReadOnly = approved;
    hasDraft = response.approvalStatus === 'draft';
    if (approved) {
      approvedYearLabel = response.academicYearLabel ?? academicYearLabel;
      step = opts?.goToStep ?? 3;
    } else {
      approvedYearLabel = null;
      step = opts?.goToStep ?? 2;
    }
    if (opts?.message !== undefined) {
      successMessage = opts.message;
    } else if (approved) {
      successMessage = null;
    }
  };

  const setupPayload = () => ({
    academicYearLabel: academicYearLabel.trim(),
    sessionStart,
    sessionEnd,
    weeklyOffs: weeklyOffDays.map(toIsoWeekday),
    terminals: applySessionBoundsToTerminals(terminals, {
      sessionStart,
      sessionEnd,
    }).map((terminal, index) => ({
      name: terminal.name.trim(),
      sortOrder: index + 1,
      startDate: terminal.startDate,
      endDate: terminal.endDate,
      reportingType: terminal.reportingType,
    })),
  });

  const startEditing = async () => {
    error = null;
    submitting = true;
    try {
      const draft = await ensurePlatformSchoolCalendarDraft(schoolId);
      hasLiveApproved = Boolean(draft.hasLiveApproved);
      hasDraft = true;
      if (draft.academicYearLabel) academicYearLabel = draft.academicYearLabel;
      approvedYearLabel = null;
      await loadClosures({
        readOnly: false,
        goToStep: 2,
        message: draft.clonedFromApproved
          ? 'Draft cloned from the live calendar. Teachers still see the approved copy until you approve.'
          : hasLiveApproved
            ? 'Editing draft. Teachers still see the approved copy until you approve.'
            : 'Editing draft calendar.',
      });
    } catch (err) {
      error = toErrorMessage(err, 'Failed to open draft for editing');
    } finally {
      submitting = false;
    }
  };

  onMount(async () => {
    if (!schoolId) {
      error = 'Missing school id';
      loading = false;
      return;
    }
    try {
      await loadPublishedYears();
      const { schools } = await listPlatformSchools();
      const school = schools.find((s) => s.id === schoolId);
      schoolName = school?.name ?? schoolId;
      if (school?.calendarStatus === 'approved') {
        hasLiveApproved = true;
        hasDraft = false;
        await loadClosures({ readOnly: true, goToStep: 3 });
      } else if (school?.calendarStatus === 'draft') {
        const draftMeta = await ensurePlatformSchoolCalendarDraft(schoolId);
        hasLiveApproved = Boolean(draftMeta.hasLiveApproved);
        hasDraft = true;
        await loadClosures({
          readOnly: false,
          goToStep: 2,
          message: hasLiveApproved
            ? 'Editing draft. Teachers still see the approved copy until you approve.'
            : null,
        });
      } else {
        step = 1;
        calendarReadOnly = false;
        hasDraft = false;
        await applyNationalWeeklyPreset(academicYearLabel);
      }
      error = null;
    } catch (err) {
      error = toErrorMessage(err, 'Failed to load school calendar');
    } finally {
      loading = false;
    }
  });

  const handleSetup = async (event: Event) => {
    event.preventDefault();
    error = null;
    submitting = true;
    try {
      const payload = setupPayload();
      if (hasDraft) {
        await updatePlatformSchoolCalendarSetup(schoolId, payload);
      } else {
        await setupPlatformSchoolCalendar(schoolId, payload);
        hasDraft = true;
      }
      await loadClosures({
        readOnly: false,
        goToStep: 2,
        message: `Draft calendar saved. Configure holidays and ${ECA_CCA_LABEL} next.`,
      });
    } catch (err) {
      error = toErrorMessage(err, 'Failed to set up calendar');
    } finally {
      submitting = false;
    }
  };

  const closuresPayload = () =>
    closures
      .filter((c) => c.name && c.startDate && c.endDate)
      .map(({ id, name, startDate, endDate, category }) => ({
        id,
        name,
        startDate,
        endDate,
        category,
      }));

  /** Persist local closures without publishing to teachers. */
  const handleSaveDraft = async () => {
    if (calendarReadOnly) return;
    error = null;
    submitting = true;
    try {
      await patchPlatformSchoolCalendarClosures(schoolId, closuresPayload());
      await loadClosures({
        readOnly: false,
        goToStep: 2,
        message: hasLiveApproved
          ? 'Draft saved. Teachers still see the approved calendar until you approve.'
          : 'Draft saved.',
      });
    } catch (err) {
      error = toErrorMessage(err, 'Failed to save draft closures');
    } finally {
      submitting = false;
    }
  };

  /** Save closures and move to approve step (does not publish yet). */
  const handleClosuresContinue = async () => {
    if (calendarReadOnly) return;
    error = null;
    submitting = true;
    try {
      await patchPlatformSchoolCalendarClosures(schoolId, closuresPayload());
      await loadClosures({
        readOnly: false,
        goToStep: 3,
        message: null,
      });
      successMessage = null;
    } catch (err) {
      error = toErrorMessage(err, 'Failed to save closures');
    } finally {
      submitting = false;
    }
  };

  /** Publish the draft as the live school calendar. */
  const handleApprove = async () => {
    if (calendarReadOnly) return;
    error = null;
    submitting = true;
    try {
      await approvePlatformSchoolCalendar(schoolId);
      hasLiveApproved = true;
      hasDraft = false;
      await loadClosures({
        readOnly: true,
        goToStep: 3,
        message: `Calendar approved for ${schoolName ?? 'school'}. Teachers now see this version.`,
      });
    } catch (err) {
      error = toErrorMessage(err, 'Failed to approve calendar');
    } finally {
      submitting = false;
    }
  };

  const handleBackToSetup = () => {
    step = 1;
    error = null;
    successMessage = null;
  };
</script>

<PlatformNav />
<main class="mx-auto max-w-6xl space-y-6 px-4 py-8" data-testid="tenant-calendar-page">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      {#if calendarReadOnly && approvedYearLabel}
        <h1
          class="text-2xl font-semibold tracking-tight text-slate-900"
          data-testid="tenant-calendar-approved-title"
        >
          {formatApprovedAcademicCalendarTitle(schoolName, approvedYearLabel)}
        </h1>
      {:else}
        <h1 class="text-2xl font-semibold text-slate-900">Configure calendar</h1>
        <p class="mt-1 text-sm text-slate-600">{schoolName ?? 'School'}</p>
        {#if !calendarReadOnly}
          <ol class="mt-4 flex gap-2 text-xs font-medium">
            {#each ['Setup', 'Closures', 'Approve'] as label, index (label)}
              <li
                class={`rounded-full px-3 py-1 ${step === index + 1 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                {index + 1}. {label}
              </li>
            {/each}
          </ol>
        {/if}
      {/if}
    </div>
    <div class="flex flex-wrap gap-2">
      {#if calendarReadOnly}
        <button
          type="button"
          class="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-60"
          disabled={submitting}
          onclick={startEditing}
          data-testid="tenant-calendar-edit"
        >
          {submitting ? 'Opening draft…' : 'Edit calendar'}
        </button>
      {/if}
      <button
        type="button"
        class="rounded-lg border border-slate-300 px-4 py-2 text-sm"
        onclick={exitToTenants}
        data-testid="tenant-calendar-exit"
      >
        Exit to tenants
      </button>
    </div>
  </div>

  <Alert message={error} testId="tenant-calendar-error" />
  <Alert variant="success" message={successMessage} testId="tenant-calendar-success" />
  {#if hasLiveApproved && !calendarReadOnly}
    <Alert
      message="Approving this draft will replace the live calendar."
      testId="tenant-calendar-live-banner"
    />
  {/if}

  {#if loading}
    <p class="text-sm text-slate-500" data-testid="tenant-calendar-loading">Loading…</p>
  {:else if step === 1}
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 class="font-medium text-slate-900">Draft calendar</h2>
      <p class="mt-1 text-sm text-slate-600">Session dates, weekly offs, and terminals.</p>
      <SetupStep
        bind:academicYearLabel
        bind:sessionStart
        bind:sessionEnd
        bind:weeklyOffDays
        bind:terminals
        {publishedYears}
        loading={submitting}
        submitLabel={hasDraft
          ? `Save setup & continue to ${ECA_CCA_LABEL}`
          : `Continue to holidays / ${ECA_CCA_LABEL}`}
        onAcademicYearChange={applyNationalWeeklyPreset}
        onSubmit={handleSetup}
      />
    </section>
  {:else if step === 2}
    <section
      class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      data-testid="tenant-calendar-closures"
    >
      <h2 class="font-medium text-slate-900">Holidays &amp; {ECA_CCA_LABEL}</h2>
      <ClosuresStep
        {bsYear}
        {nationalClosures}
        bind:closures
        {sessionStart}
        {sessionEnd}
        weeklyOffs={weeklyOffDays.map(toIsoWeekday)}
        loading={submitting}
        readOnly={false}
        onBackToSetup={handleBackToSetup}
        onSaveDraft={handleSaveDraft}
        continueLabel="Continue to approve"
        onContinue={handleClosuresContinue}
      />
    </section>
  {:else}
    <section
      class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      data-testid={calendarReadOnly ? 'tenant-calendar-readonly' : 'tenant-calendar-approve'}
    >
      <ApproveStep
        approvedYearLabel={calendarReadOnly ? approvedYearLabel : null}
        loading={submitting}
        hasLiveApproved={hasLiveApproved}
        onApprove={handleApprove}
        onEdit={calendarReadOnly ? startEditing : undefined}
        onBack={calendarReadOnly ? undefined : () => (step = 2)}
        {bsYear}
        {nationalClosures}
        {closures}
        {sessionStart}
        {sessionEnd}
        weeklyOffs={weeklyOffDays.map(toIsoWeekday)}
        loadTeachingDays={() => getPlatformSchoolTeachingDays(schoolId)}
      />
    </section>
  {/if}
</main>
