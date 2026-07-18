<script lang="ts">
  import { onMount } from 'svelte';
  import AdminNav from '../shared/AdminNav.svelte';
  import { getAdminFestivalPlanner, getSettlingProgramme } from './api';
  import {
    adminFestivalHeadline,
    type AdminFestivalPlannerShape,
    type SettlingProgrammeShape,
  } from './manage-logic';

  let plan = $state<AdminFestivalPlannerShape | null>(null);
  let settling = $state<SettlingProgrammeShape | null>(null);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      [plan, settling] = await Promise.all([getAdminFestivalPlanner(), getSettlingProgramme()]);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load';
    }
  });
</script>

<AdminNav />

<main class="mx-auto max-w-2xl px-4 py-8">
  <h1 class="text-2xl font-semibold text-slate-900">School manage</h1>
  <p class="mt-1 text-sm text-slate-600">Festival planner and settling programme (school altitude).</p>
  {#if plan}
    <p class="mt-4 text-sm" data-testid="admin-festival">{adminFestivalHeadline(plan)}</p>
    <ul class="mt-2 space-y-1 text-sm text-slate-700">
      {#each plan.festivals as f}
        <li>{f.name}: {f.startDate} – {f.endDate}</li>
      {/each}
    </ul>
  {/if}
  {#if settling}
    <p class="mt-4 text-sm text-slate-600" data-testid="admin-settling">
      {settling.steps.length} settling weeks configured
    </p>
  {/if}
  {#if error}
    <p class="mt-4 text-sm text-red-700" role="alert">{error}</p>
  {/if}
</main>
