<script lang="ts">
  import TeacherNav from '../shared/TeacherNav.svelte';
  import { createAssignmentLoadGate } from '../../lib/shared/stores/assignment-load-gate';
  import { selectedAssignmentKey } from '../../lib/shared/stores/teacher-context';
  import { getClassTeacherOversight } from './api';
  import { oversightHeadline, type OversightShape } from './subject-logic';

  const loadGate = createAssignmentLoadGate();

  let view = $state<OversightShape | null>(null);
  let error = $state<string | null>(null);

  $effect(() => {
    const key = $selectedAssignmentKey;
    const token = loadGate.begin(key);
    if (token === null) return;
    void (async () => {
      try {
        const next = await getClassTeacherOversight();
        if (!loadGate.isCurrent(token)) return;
        view = next;
        error = null;
      } catch (err) {
        if (!loadGate.isCurrent(token)) return;
        error = err instanceof Error ? err.message : 'Failed to load oversight';
        view = null;
      }
    })();
  });
</script>

<TeacherNav />
<main class="mx-auto max-w-2xl px-4 py-8">
  <h1 class="text-2xl font-semibold text-slate-900">Class teacher oversight</h1>
  <p class="mt-1 text-sm text-slate-600">Section-wide letter grades for report assembly. Never ranked.</p>

  {#if view}
    <section class="mt-6 rounded-lg border border-slate-200 p-4" data-testid="oversight-view">
      <p class="text-sm text-slate-600">{oversightHeadline(view)}</p>
      <ul class="mt-4 space-y-2 text-sm">
        {#each view.children as c}
          <li class="flex justify-between border-b border-slate-100 py-2">
            <span>#{c.rollNumber} {c.name}</span>
            <span class="font-medium">{c.letterCode ?? '—'}</span>
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if error}
    <p class="mt-4 text-sm text-red-700" role="alert">{error}</p>
  {/if}
</main>
