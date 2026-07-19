<script lang="ts">
  import TeacherNav from '../shared/TeacherNav.svelte';
  import { createAssignmentLoadGate } from '../../lib/shared/stores/assignment-load-gate';
  import { selectedAssignmentKey } from '../../lib/shared/stores/teacher-context';
  import { getRemedialPlans } from './api';
  import { teacherPlanLine, type RemedialListShape } from './remedial-logic';

  const loadGate = createAssignmentLoadGate();

  let list = $state<RemedialListShape | null>(null);
  let error = $state<string | null>(null);

  $effect(() => {
    const key = $selectedAssignmentKey;
    const token = loadGate.begin(key);
    if (token === null) return;
    void (async () => {
      try {
        const next = await getRemedialPlans();
        if (!loadGate.isCurrent(token)) return;
        list = next;
        error = null;
      } catch (err) {
        if (!loadGate.isCurrent(token)) return;
        error = err instanceof Error ? err.message : 'Failed to load remedial plans';
        list = null;
      }
    })();
  });
</script>

<TeacherNav />
<main class="mx-auto max-w-2xl px-4 py-8">
  <h1 class="text-2xl font-semibold text-slate-900">Remedial tracker</h1>
  <p class="mt-1 text-sm text-slate-600">Named children and plan state for your section.</p>

  {#if list}
    <section class="mt-6 rounded-lg border border-slate-200 p-4" data-testid="remedial-list">
      {#if list.plans.length === 0}
        <p class="text-sm text-slate-500">No open remedial plans.</p>
      {:else}
        <ul class="space-y-2 text-sm">
          {#each list.plans as plan}
            <li data-testid="remedial-plan">{teacherPlanLine(plan)}</li>
          {/each}
        </ul>
      {/if}
    </section>
  {/if}

  {#if error}
    <p class="mt-4 text-sm text-red-700" role="alert">{error}</p>
  {/if}
</main>
