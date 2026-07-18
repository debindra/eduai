<script lang="ts">
  import { onMount } from 'svelte';
  import TeacherNav from '../shared/TeacherNav.svelte';
  import { getPacing } from './api';
  import { assertNoOutcomeMerge, pacingBadgeLabel, type PacingApiState } from './pacing-logic';

  let state = $state<PacingApiState | null>(null);
  let remaining = $state(0);
  let gap = $state(0);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      const pacing = await getPacing();
      if (!assertNoOutcomeMerge(pacing as unknown as Record<string, unknown>)) {
        error = 'Invalid pacing payload — outcomes must not merge into coverage';
        return;
      }
      state = pacing.state;
      remaining = pacing.teachingDaysRemaining;
      gap = pacing.gapTeachingDays;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load pacing';
    }
  });
</script>

<TeacherNav />
<main class="mx-auto max-w-lg px-4 py-8">
  <h1 class="text-2xl font-semibold text-slate-900">Pacing</h1>
  <p class="mt-1 text-sm text-slate-600">Coverage only — not a learning health score.</p>

  {#if state}
    <p class="mt-6 text-lg font-medium" data-testid="pacing-badge">{pacingBadgeLabel(state)}</p>
    <p class="mt-2 text-sm text-slate-600">Gap: {gap} teaching days · Remaining: {remaining}</p>
  {/if}
  {#if error}
    <p class="mt-4 text-sm text-red-700" role="alert">{error}</p>
  {/if}
</main>
