<script lang="ts">
  import { onMount } from 'svelte';
  import TeacherNav from '../shared/TeacherNav.svelte';
  import { getSubjectView } from './api';
  import { subjectViewHeadline, type SubjectViewShape } from './subject-logic';

  let view = $state<SubjectViewShape | null>(null);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      view = await getSubjectView();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load subject view';
    }
  });
</script>

<TeacherNav />
<main class="mx-auto max-w-2xl px-4 py-8">
  <h1 class="text-2xl font-semibold text-slate-900">Subject teacher</h1>
  <p class="mt-1 text-sm text-slate-600">Write your subject · read section roster.</p>

  {#if view}
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

  {#if error}
    <p class="mt-4 text-sm text-red-700" role="alert">{error}</p>
  {/if}
</main>
