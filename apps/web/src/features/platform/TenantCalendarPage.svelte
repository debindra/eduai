<script lang="ts">
  import { onMount } from 'svelte';
  import { push } from '@keenmate/svelte-spa-router';
  import PlatformNav from '../shared/PlatformNav.svelte';
  import Alert from '../shared/Alert.svelte';
  import SetupStep from '../calendar/components/SetupStep.svelte';
  import ClosuresStep from '../calendar/components/ClosuresStep.svelte';
  import { ECA_CCA_LABEL } from '../calendar/calendar-markers-logic';
  import {
    bsYearFromAcademicLabel,
    fromIsoWeekday,
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
    listNationalCalendars,
    listPlatformSchools,
    patchPlatformSchoolCalendarClosures,
    setupPlatformSchoolCalendar,
  } from './api';
  import { formatApprovedAcademicCalendarTitle } from './platform-logic';

  type Props = {
    /** Passed by @keenmate/svelte-spa-router for `:schoolId` routes. */
    routeParams?: { schoolId?: string };
  };

  let { routeParams = {} }: Props = $props();

  const schoolId = $derived(routeParams.schoolId ?? '');

  type WizardStep = 'setup' | 'closures';

  let schoolName = $state<string | null>(null);
  let wizardStep = $state<WizardStep>('setup');
  let calendarReadOnly = $state(false);
  let hasLiveApproved = $state(false);
  let loading = $state(true);
  let submitting = $state(false);
  let error = $state<string | null>(null);
  let successMessage = $state<string | null>(null);

  let academicYearLabel = $state('2082/83');
  let sessionStart = $state('');
  let sessionEnd = $state('');
  let weeklyOffDays = $state<number[]>([6]);
  let terminals = $state<TerminalDraft[]>([
    { name: 'Terminal 1', startDate: '', endDate: '', reportingType: 'formative' },
  ]);

  let bsYear = $state<number | null>(null);
  let nationalClosures = $state<NationalClosure[]>([]);
  let closures = $state<LocalClosure[]>([]);

  const exitToTenants = async () => {
    await push('/platform/schools');
  };

  /** Prefill setup weekly offs from published national calendar for this BS year. */
  const applyNationalWeeklyPreset = async () => {
    const year = bsYearFromAcademicLabel(academicYearLabel) ?? 2082;
    try {
      const { calendars } = await listNationalCalendars();
      const published =
        calendars.find((c) => c.status === 'published' && c.bsYear === year) ??
        calendars.find((c) => c.status === 'published');
      if (published?.weeklyOffs?.length) {
        weeklyOffDays = published.weeklyOffs.map(fromIsoWeekday);
      }
    } catch {
      // Keep default Saturday when national calendar is unavailable.
    }
  };

  const loadClosures = async (opts?: { readOnly?: boolean; message?: string | null }) => {
    const response = await getPlatformSchoolCalendarClosures(schoolId);
    bsYear = response.bsYear ?? null;
    if (response.academicYearLabel) academicYearLabel = response.academicYearLabel;
    if (response.sessionStart) sessionStart = response.sessionStart;
    if (response.sessionEnd) sessionEnd = response.sessionEnd;
    if (response.weeklyOffs && response.weeklyOffs.length > 0) {
      weeklyOffDays = response.weeklyOffs.map(fromIsoWeekday);
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
    const approved =
      opts?.readOnly !== undefined
        ? opts.readOnly
        : response.approvalStatus === 'approved';
    calendarReadOnly = approved;
    wizardStep = 'closures';
    if (opts?.message !== undefined) {
      successMessage = opts.message;
    } else if (approved) {
      successMessage = null;
    }
  };

  const startEditing = async () => {
    error = null;
    submitting = true;
    try {
      const draft = await ensurePlatformSchoolCalendarDraft(schoolId);
      hasLiveApproved = Boolean(draft.hasLiveApproved);
      if (draft.academicYearLabel) academicYearLabel = draft.academicYearLabel;
      await loadClosures({
        readOnly: false,
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
      const { schools } = await listPlatformSchools();
      const school = schools.find((s) => s.id === schoolId);
      schoolName = school?.name ?? schoolId;
      if (school?.calendarStatus === 'approved') {
        hasLiveApproved = true;
        await loadClosures({ readOnly: true });
      } else if (school?.calendarStatus === 'draft') {
        const draftMeta = await ensurePlatformSchoolCalendarDraft(schoolId);
        hasLiveApproved = Boolean(draftMeta.hasLiveApproved);
        await loadClosures({
          readOnly: false,
          message: hasLiveApproved
            ? 'Editing draft. Teachers still see the approved copy until you approve.'
            : null,
        });
      } else {
        wizardStep = 'setup';
        calendarReadOnly = false;
        await applyNationalWeeklyPreset();
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
      await setupPlatformSchoolCalendar(schoolId, {
        academicYearLabel: academicYearLabel.trim(),
        sessionStart,
        sessionEnd,
        weeklyOffs: weeklyOffDays.map(toIsoWeekday),
        terminals: terminals.map((terminal, index) => ({
          name: terminal.name.trim(),
          sortOrder: index + 1,
          startDate: terminal.startDate,
          endDate: terminal.endDate,
          reportingType: terminal.reportingType,
        })),
      });
      await loadClosures({
        readOnly: false,
        message: `Draft calendar created. Configure holidays and ${ECA_CCA_LABEL} next.`,
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

  /** Persist closures and publish the draft as the live school calendar. */
  const handleApprove = async () => {
    if (calendarReadOnly) return;
    error = null;
    submitting = true;
    try {
      await patchPlatformSchoolCalendarClosures(schoolId, closuresPayload());
      await approvePlatformSchoolCalendar(schoolId);
      hasLiveApproved = true;
      await loadClosures({
        readOnly: true,
        message: `Calendar approved for ${schoolName ?? 'school'}. Teachers now see this version.`,
      });
    } catch (err) {
      error = toErrorMessage(err, 'Failed to save closures or approve calendar');
    } finally {
      submitting = false;
    }
  };
</script>

<PlatformNav />
<main class="mx-auto max-w-6xl space-y-6 px-4 py-8" data-testid="tenant-calendar-page">
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      {#if calendarReadOnly}
        <h1
          class="text-2xl font-semibold tracking-tight text-slate-900"
          data-testid="tenant-calendar-approved-title"
        >
          {formatApprovedAcademicCalendarTitle(schoolName, academicYearLabel)}
        </h1>
      {:else}
        <h1 class="text-2xl font-semibold text-slate-900">Configure calendar</h1>
        <p class="mt-1 text-sm text-slate-600">{schoolName ?? 'School'}</p>
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
  {:else if wizardStep === 'setup'}
    <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 class="font-medium text-slate-900">Draft calendar</h2>
      <p class="mt-1 text-sm text-slate-600">Session dates, weekly offs, and terminals.</p>
      <SetupStep
        bind:academicYearLabel
        bind:sessionStart
        bind:sessionEnd
        bind:weeklyOffDays
        bind:terminals
        loading={submitting}
        submitLabel={`Continue to holidays / ${ECA_CCA_LABEL}`}
        onSubmit={handleSetup}
      />
    </section>
  {:else}
    <section
      class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      data-testid={calendarReadOnly ? 'tenant-calendar-readonly' : 'tenant-calendar-closures'}
    >
      {#if !calendarReadOnly}
        <h2 class="font-medium text-slate-900">Holidays &amp; {ECA_CCA_LABEL}</h2>
      {/if}
      <ClosuresStep
        {bsYear}
        {nationalClosures}
        bind:closures
        {sessionStart}
        {sessionEnd}
        weeklyOffs={weeklyOffDays.map(toIsoWeekday)}
        loading={submitting}
        readOnly={calendarReadOnly}
        onSaveDraft={handleSaveDraft}
        continueLabel="Approve calendar"
        onContinue={handleApprove}
      />
    </section>
  {/if}
</main>
