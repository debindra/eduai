<script lang="ts">
  import TeacherNav from '../shared/TeacherNav.svelte';
  import Alert from '../shared/Alert.svelte';
  import { toErrorMessage } from '../../lib/shared/errors';
  import { createAssignmentLoadGate } from '../../lib/shared/stores/assignment-load-gate';
  import {
    getSelectedSubjectId,
    selectedAssignmentKey,
  } from '../../lib/shared/stores/teacher-context';
  import { getSubjectView } from './api';
  import { subjectViewHeadline, type SubjectViewShape } from './subject-logic';

  const loadGate = createAssignmentLoadGate();

  let view = $state<SubjectViewShape | null>(null);
  let error = $state<string | null>(null);
  let loading = $state(true);

  const load = async () => {
    const token = loadGate.begin($selectedAssignmentKey);
    if (token === null) return;
    const subjectId = getSelectedSubjectId();
    if (!subjectId) {
      view = null;
      error = 'Select a subject-teacher assignment in the nav to open the subject write view.';
      loading = false;
      return;
    }
    loading = true;
    error = null;
    try {
      const next = await getSubjectView(subjectId);
      if (!loadGate.isCurrent(token)) return;
      view = next;
    } catch (err) {
      if (!loadGate.isCurrent(token)) return;
      error = toErrorMessage(err, 'Failed to load subject view');
      view = null;
    } finally {
      if (loadGate.isCurrent(token)) loading = false;
    }
  };

  $effect(() => {
    const key = $selectedAssignmentKey;
    if (!key) return;
    void load();
  });
</script>

<TeacherNav />
<main class="mx-auto max-w-2xl px-4 py-8">
  <h1 class="text-2xl font-semibold text-slate-900">Subject teacher</h1>
  <p class="mt-1 text-sm text-slate-600">Write your subject · read section roster.</p>

  {#if loading}
    <p class="mt-6 text-sm text-slate-500">Loading…</p>
  {:else if view}
    <section class="mt-6 rounded-lg border border-slate-200 p-4" data-testid="subject-view">
      <p class="text-sm text-slate-600">{subjectViewHeadline(view)}</p>
      <p class="mt-2 text-xs text-slate-500">Write grain: {view.writeScope}</p>
      <h2 class="mt-4 font-medium text-slate-900">Outcomes</h2>
      <ul class="mt-2 space-y-1 text-sm">
        {#each view.outcomes as o}
          <li>{o.code}: {o.statement}</li>
        {/each}
      </ul>
      <h2 class="mt-4 font-medium text-slate-900">Section roster</h2>
      <ul class="mt-2 space-y-1 text-sm">
        {#each view.children as c}
          <li>#{c.rollNumber} {c.name}</li>
        {/each}
      </ul>
    </section>
  {/if}
  <Alert message={error} class="mt-4" />
</main>
