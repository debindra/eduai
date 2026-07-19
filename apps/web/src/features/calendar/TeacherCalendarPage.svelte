<script lang="ts">
  import { onMount } from 'svelte';
  import TeacherNav from '../shared/TeacherNav.svelte';
  import Alert from '../shared/Alert.svelte';
  import { toErrorMessage } from '../../lib/shared/errors';
  import { getCalendarView, type CalendarViewResponse } from './api';
  import SchoolCalendarBoard from './SchoolCalendarBoard.svelte';
  import {
    formatAcademicCalendarTitle,
    isConfiguredCalendarView,
  } from './school-calendar-view-logic';

  let view = $state<CalendarViewResponse | null>(null);
  let error = $state<string | null>(null);
  let loading = $state(true);

  onMount(async () => {
    try {
      view = await getCalendarView();
    } catch (err) {
      error = toErrorMessage(err, 'Could not load school calendar');
    } finally {
      loading = false;
    }
  });
</script>

<TeacherNav />
<main class="mx-auto max-w-4xl px-4 py-8">
  {#if loading}
    <p class="text-sm text-slate-500">Loading…</p>
  {:else if error}
    <h1 class="text-2xl font-semibold text-slate-900">Academic Calendar</h1>
    <Alert message={error} class="mt-6" />
  {:else if !isConfiguredCalendarView(view)}
    <h1 class="text-2xl font-semibold text-slate-900">Academic Calendar</h1>
    <p class="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
      No school calendar has been set up yet.
    </p>
  {:else}
    <h1 class="text-2xl font-semibold tracking-tight text-slate-900">
      {formatAcademicCalendarTitle(view.academicYearLabel)}
    </h1>
    {#if view.approvalStatus === 'draft'}
      <p
        class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        role="status"
      >
        Draft — not yet approved.
      </p>
    {/if}
    <div class="mt-6">
      <SchoolCalendarBoard {view} title="" readOnly={true} />
    </div>
  {/if}
</main>
