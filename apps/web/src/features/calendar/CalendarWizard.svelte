<script lang="ts">
  import { onMount } from 'svelte';
  import AdminNav from '../shared/AdminNav.svelte';
  import Alert from '../shared/Alert.svelte';
  import { toErrorMessage } from '../../lib/shared/errors';
  import SetupStep from './components/SetupStep.svelte';
  import ClosuresStep from './components/ClosuresStep.svelte';
  import ApproveStep from './components/ApproveStep.svelte';
  import {
    activePickerItems,
    type SchoolEcaCcaItem,
  } from '../eca-cca/eca-cca-logic';
  import { getSchoolEcaCcaBundle } from '../manage/api';
  import {
    approveCalendar,
    ensureCalendarDraft,
    getCalendarStatus,
    getCalendarView,
    getFestivalTemplate,
    getWeeklyOffPreset,
    patchFestivalTemplate,
    setupCalendar,
    updateCalendarSetup,
    type CalendarViewResponse,
  } from './api';
  import {
    defaultAcademicYearLabel,
    defaultFirstTerminal,
    defaultSessionBoundsFromLabel,
    applySessionBoundsToTerminals,
    isDraftCalendarAlreadyExistsError,
    isDraftCalendarNotFoundError,
    resolveWizardStepFromStatus,
    resolveTargetBsYear,
    toIsoWeekday,
    fromIsoWeekday,
    type LocalClosure,
    type NationalClosure,
    type TerminalDraft,
  } from './calendar-wizard-logic';
  import { formatAcademicCalendarTitle } from './school-calendar-view-logic';

  let step = $state(1);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let calendarId = $state<string | null>(null);
  let approvedYearLabel = $state<string | null>(null);
  let hasLiveApproved = $state(false);
  /** True when a draft already exists — Setup submits via PATCH. */
  let hasDraft = $state(false);
  /** Shared with teacher/platform — drives identical board markers when configured. */
  let configuredView = $state<CalendarViewResponse | null>(null);

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

  let closures = $state<LocalClosure[]>([]);
  let nationalClosures = $state<NationalClosure[]>([]);
  let bsYear = $state<number | null>(null);
  let schoolActivities = $state<SchoolEcaCcaItem[]>([]);

  const setupPayload = () => ({
    academicYearLabel,
    sessionStart,
    sessionEnd,
    weeklyOffs: weeklyOffDays.map(toIsoWeekday),
    terminals: applySessionBoundsToTerminals(terminals, {
      sessionStart,
      sessionEnd,
    }).map((terminal, index) => ({
      name: terminal.name,
      sortOrder: index + 1,
      startDate: terminal.startDate,
      endDate: terminal.endDate,
      reportingType: terminal.reportingType,
    })),
  });

  const applySessionDefaultsFromLabel = (label: string) => {
    const bounds = defaultSessionBoundsFromLabel(label);
    if (!bounds) return;
    sessionStart = bounds.sessionStart;
    sessionEnd = bounds.sessionEnd;
    terminals = applySessionBoundsToTerminals(terminals, bounds, {
      syncSingleTerminal: true,
    });
  };

  const refreshNationalPreset = async (label: string) => {
    applySessionDefaultsFromLabel(label);
    const year = resolveTargetBsYear(label);
    if (year == null) return;
    try {
      const preset = await getWeeklyOffPreset(year);
      weeklyOffDays = preset.weeklyOffs.map(fromIsoWeekday);
      if (preset.fromNational) {
        if (!publishedYears.includes(year)) {
          publishedYears = [...publishedYears, year];
        }
      } else {
        publishedYears = publishedYears.filter((y) => y !== year);
      }
    } catch {
      // Keep current weekly offs when preset is unavailable.
    }
  };

  const loadSchoolActivities = async () => {
    try {
      const bundle = await getSchoolEcaCcaBundle();
      schoolActivities = activePickerItems(bundle.schoolItems);
    } catch {
      schoolActivities = [];
    }
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
      const payload = setupPayload();
      const response = hasDraft
        ? await updateCalendarSetup(payload)
        : await setupCalendar(payload);
      calendarId = response.schoolCalendarId;
      hasDraft = true;
      goToFestivals();
    } catch (err) {
      const message = toErrorMessage(err, 'Setup failed');
      if (isDraftCalendarAlreadyExistsError(message)) {
        error = null;
        hasDraft = true;
        goToFestivals();
      } else {
        error = message;
      }
    } finally {
      loading = false;
    }
  };

  const applyViewClosures = (response: Awaited<ReturnType<typeof getCalendarView>>) => {
    configuredView = response;
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
        reportingType: 'formative',
      }));
    }
    nationalClosures = response.nationalClosures.map((c) => ({
      id: c.id,
      name: c.name,
      startDate: c.startDate,
      endDate: c.endDate,
      category: c.category,
    }));
    closures = response.closures.map((c) => ({
      id: c.id,
      name: c.name,
      startDate: c.startDate,
      endDate: c.endDate,
      category: (c.category as LocalClosure['category']) ?? 'school_holiday',
      schoolActivityId:
        (c as { schoolActivityId?: string | null }).schoolActivityId ?? null,
      iconKey: (c as { iconKey?: string | null }).iconKey ?? null,
    }));
  };

  const applySessionFromView = async () => {
    try {
      const view = await getCalendarView();
      configuredView = view;
      if (view.academicYearLabel) academicYearLabel = view.academicYearLabel;
      if (view.sessionStart) sessionStart = view.sessionStart;
      if (view.sessionEnd) sessionEnd = view.sessionEnd;
      if (view.weeklyOffs && view.weeklyOffs.length > 0) {
        weeklyOffDays = view.weeklyOffs.map(fromIsoWeekday);
      }
      if (view.bsYear != null) bsYear = view.bsYear;
      if (view.terminals?.length) {
        terminals = view.terminals.map((t) => ({
          name: t.name,
          startDate: t.startDate,
          endDate: t.endDate,
          reportingType: 'formative',
        }));
      }
    } catch {
      // Non-fatal — board still works without weekly-off markers until refresh.
    }
  };

  const hydrateFromFestivalResponse = (
    response: Awaited<ReturnType<typeof getFestivalTemplate>>,
  ) => {
    calendarId = response.schoolCalendarId;
    bsYear = (response as { bsYear?: number }).bsYear ?? null;
    if (response.academicYearLabel) academicYearLabel = response.academicYearLabel;
    if (response.sessionStart) sessionStart = response.sessionStart;
    if (response.sessionEnd) sessionEnd = response.sessionEnd;
    if (response.weeklyOffs && response.weeklyOffs.length > 0) {
      weeklyOffDays = response.weeklyOffs.map(fromIsoWeekday);
    }
    const terminalRows = (
      response as {
        terminals?: Array<{
          name: string;
          startDate: string;
          endDate: string;
          reportingType?: TerminalDraft['reportingType'];
        }>;
      }
    ).terminals;
    if (terminalRows?.length) {
      terminals = terminalRows.map((t) => ({
        name: t.name,
        startDate: t.startDate,
        endDate: t.endDate,
        reportingType: t.reportingType ?? 'formative',
      }));
    }
    nationalClosures =
      (response as { nationalClosures?: NationalClosure[] }).nationalClosures ?? [];
    closures = response.closures.map((c) => ({
      id: c.id,
      name: c.name,
      startDate: c.startDate,
      endDate: c.endDate,
      category:
        ((c as { category?: LocalClosure['category'] }).category as LocalClosure['category']) ??
        'school_holiday',
      schoolActivityId:
        (c as { schoolActivityId?: string | null }).schoolActivityId ?? null,
      iconKey: (c as { iconKey?: string | null }).iconKey ?? null,
    }));
  };

  const loadFestivals = async () => {
    loading = true;
    error = null;
    try {
      const response = await getFestivalTemplate();
      hasDraft = response.approvalStatus === 'draft';
      hydrateFromFestivalResponse(response);
      await Promise.all([applySessionFromView(), loadSchoolActivities()]);
    } catch (err) {
      const message = toErrorMessage(err, 'Could not load festival template');
      if (isDraftCalendarNotFoundError(message)) {
        const status = await getCalendarStatus();
        const resume = resolveWizardStepFromStatus({
          ...status,
          schoolCalendarId: status.schoolCalendarId ?? null,
          hasLiveApproved: (status as { hasLiveApproved?: boolean }).hasLiveApproved,
        });
        if (resume?.action === 'approved') {
          calendarId = resume.calendarId;
          approvedYearLabel = resume.academicYearLabel;
          hasLiveApproved = true;
          hasDraft = false;
          step = 3;
          error = null;
          const view = await getCalendarView();
          applyViewClosures(view);
          return;
        }
      }
      error = message;
    } finally {
      loading = false;
    }
  };

  const loadApprovedView = async () => {
    try {
      const view = await getCalendarView();
      applyViewClosures(view);
    } catch (err) {
      error = toErrorMessage(err, 'Could not load calendar view');
    }
  };

  const handleFestivalsContinue = async () => {
    loading = true;
    error = null;
    try {
      await patchFestivalTemplate({
        closures: closures
          .filter((c) => c.name && c.startDate && c.endDate)
          .map(({ id, name, startDate, endDate, category, schoolActivityId }) => ({
            id,
            name,
            startDate,
            endDate,
            category,
            schoolActivityId: schoolActivityId ?? null,
          })),
      } as Parameters<typeof patchFestivalTemplate>[0]);
      const view = await getCalendarView();
      applyViewClosures(view);
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
      hasLiveApproved = true;
      hasDraft = false;
      const view = await getCalendarView();
      applyViewClosures(view);
    } catch (err) {
      error = toErrorMessage(err, 'Approval failed');
    } finally {
      loading = false;
    }
  };

  const handleEditApproved = async () => {
    loading = true;
    error = null;
    try {
      const draft = await ensureCalendarDraft();
      calendarId = draft.schoolCalendarId;
      approvedYearLabel = null;
      hasLiveApproved = Boolean(draft.hasLiveApproved);
      hasDraft = true;
      step = 2;
      await loadFestivals();
    } catch (err) {
      error = toErrorMessage(err, 'Could not open draft for editing');
    } finally {
      loading = false;
    }
  };

  const handleBackToSetup = () => {
    step = 1;
    error = null;
  };

  onMount(async () => {
    loading = true;
    error = null;
    try {
      const status = await getCalendarStatus();
      const resume = resolveWizardStepFromStatus({
        ...status,
        schoolCalendarId: status.schoolCalendarId ?? null,
        hasLiveApproved: (status as { hasLiveApproved?: boolean }).hasLiveApproved,
      });
      if (resume?.action === 'festivals') {
        calendarId = resume.calendarId;
        hasLiveApproved = resume.hasLiveApproved;
        hasDraft = true;
        step = 2;
        await loadFestivals();
        return;
      }
      if (resume?.action === 'approved') {
        calendarId = resume.calendarId;
        approvedYearLabel = resume.academicYearLabel;
        hasLiveApproved = true;
        hasDraft = false;
        step = 3;
        await loadApprovedView();
        return;
      }
      await refreshNationalPreset(academicYearLabel);
    } catch (err) {
      error = toErrorMessage(err, 'Could not load calendar status');
    } finally {
      loading = false;
    }
  });
</script>

<AdminNav />

<main class="mx-auto min-h-screen max-w-4xl px-4 py-12">
  <div class="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
    {#if approvedYearLabel && step === 3}
      <h1
        class="text-2xl font-semibold tracking-tight text-slate-900"
        data-testid="calendar-wizard-approved-title"
      >
        {formatAcademicCalendarTitle(approvedYearLabel)}
      </h1>
    {:else}
      <h1 class="text-2xl font-semibold text-slate-900">Configure calendar</h1>
      <ol class="mt-6 flex gap-2 text-xs font-medium">
        {#each ['Setup', 'Closures', 'Approve'] as label, index (label)}
          <li
            class={`rounded-full px-3 py-1 ${step === index + 1 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            {index + 1}. {label}
          </li>
        {/each}
      </ol>
    {/if}

    <Alert message={error} class="mt-4" />
    {#if hasLiveApproved && !approvedYearLabel && step >= 2}
      <p
        class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        role="status"
        data-testid="calendar-wizard-live-banner"
      >
        Approving this draft will replace the live calendar.
      </p>
    {/if}

    {#if step === 1}
      <SetupStep
        bind:academicYearLabel
        bind:sessionStart
        bind:sessionEnd
        bind:weeklyOffDays
        bind:terminals
        {publishedYears}
        {loading}
        submitLabel={hasDraft ? 'Save setup & continue' : 'Continue to closures'}
        onAcademicYearChange={refreshNationalPreset}
        onSubmit={handleSetup}
      />
    {:else if step === 2}
      <ClosuresStep
        {bsYear}
        {nationalClosures}
        bind:closures
        sessionStart={sessionStart}
        sessionEnd={sessionEnd}
        weeklyOffs={weeklyOffDays.map(toIsoWeekday)}
        {schoolActivities}
        {loading}
        onBackToSetup={handleBackToSetup}
        onContinue={handleFestivalsContinue}
      />
    {:else}
      <ApproveStep
        {approvedYearLabel}
        {loading}
        {hasLiveApproved}
        onApprove={handleApprove}
        onEdit={handleEditApproved}
        onBack={approvedYearLabel ? undefined : () => (step = 2)}
        configuredView={configuredView}
        {bsYear}
        {nationalClosures}
        {closures}
        sessionStart={sessionStart}
        sessionEnd={sessionEnd}
        weeklyOffs={weeklyOffDays.map(toIsoWeekday)}
      />
    {/if}
  </div>
</main>
