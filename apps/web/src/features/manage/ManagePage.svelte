<script lang="ts">
  import TeacherNav from '../shared/TeacherNav.svelte';
  import { createAssignmentLoadGate } from '../../lib/shared/stores/assignment-load-gate';
  import { selectedAssignmentKey } from '../../lib/shared/stores/teacher-context';
  import { getFestivalPlanner, getSettlingProgramme, getSubstitutePack } from './api';
  import { festivalHeadline, type FestivalPlannerShape, type SettlingProgrammeShape } from './manage-logic';

  const loadGate = createAssignmentLoadGate();

  let plan = $state<FestivalPlannerShape | null>(null);
  let settling = $state<SettlingProgrammeShape | null>(null);
  let substituteNote = $state<string | null>(null);
  let error = $state<string | null>(null);

  $effect(() => {
    const key = $selectedAssignmentKey;
    const token = loadGate.begin(key);
    if (token === null) return;
    void (async () => {
      try {
        const [p, s, sub] = await Promise.all([
          getFestivalPlanner(),
          getSettlingProgramme(),
          getSubstitutePack(),
        ]);
        if (!loadGate.isCurrent(token)) return;
        plan = p;
        settling = s;
        substituteNote = sub.note;
        error = null;
      } catch (err) {
        if (!loadGate.isCurrent(token)) return;
        error = err instanceof Error ? err.message : 'Failed to load manage views';
      }
    })();
  });
</script>

<TeacherNav />
<main class="mx-auto max-w-2xl px-4 py-8">
  <h1 class="text-2xl font-semibold text-slate-900">PTM prep &amp; event planner</h1>
  <p class="mt-1 text-sm text-slate-600">Festival calendar, settling programme, and substitute pack.</p>

  {#if plan}
    <section class="mt-6 rounded-lg border border-slate-200 p-4" data-testid="festival-planner">
      <h2 class="font-medium text-slate-900">Festivals</h2>
      <p class="mt-1 text-sm text-slate-600">{festivalHeadline(plan)}</p>
      <ul class="mt-3 space-y-1 text-sm">
        {#each plan.festivals as f}
          <li>{f.name}: {f.startDate} – {f.endDate}</li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if settling}
    <section class="mt-4 rounded-lg border border-slate-200 p-4" data-testid="settling-programme">
      <h2 class="font-medium text-slate-900">Settling programme</h2>
      <ol class="mt-2 list-decimal space-y-2 pl-5 text-sm">
        {#each settling.steps as step}
          <li><strong>Week {step.weekNumber}:</strong> {step.title} — {step.body}</li>
        {/each}
      </ol>
    </section>
  {/if}

  {#if substituteNote}
    <section class="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      {substituteNote}
    </section>
  {/if}

  {#if error}
    <p class="mt-4 text-sm text-red-700" role="alert">{error}</p>
  {/if}
</main>
