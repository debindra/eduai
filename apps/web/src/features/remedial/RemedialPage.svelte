<script lang="ts">
  import { onMount } from 'svelte';
  import TeacherNav from '../shared/TeacherNav.svelte';
  import { getRemedialPlans } from './api';
  import { teacherPlanLine, type RemedialListShape } from './remedial-logic';

  let list = $state<RemedialListShape | null>(null);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      list = await getRemedialPlans();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load remedial plans';
    }
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
