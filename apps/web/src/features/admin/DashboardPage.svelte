<script lang="ts">
  import { onMount } from 'svelte';
  import AdminNav from '../shared/AdminNav.svelte';
  import { getAdminDashboard } from './api';
  import { assertGravitySafe, formatReplyRate, type AdminDashboardShape } from './admin-logic';

  let data = $state<AdminDashboardShape | null>(null);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      const dashboard = await getAdminDashboard();
      if (!assertGravitySafe(dashboard as unknown as Record<string, unknown>)) {
        error = 'Dashboard payload violated gravity rule (names/distributions)';
        return;
      }
      data = dashboard;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load dashboard';
    }
  });
</script>

<AdminNav />

<main class="mx-auto max-w-3xl px-4 py-8">
  <h1 class="text-2xl font-semibold text-slate-900">Compliance dashboard</h1>
  <p class="mt-1 text-sm text-slate-600">Counts and shapes only — never names or rating distributions.</p>

  {#if data}
    <dl class="mt-6 grid gap-4 sm:grid-cols-2" data-testid="admin-dashboard">
      <div class="rounded-lg border border-slate-200 p-4">
        <dt class="text-sm text-slate-500">Sections behind (pacing)</dt>
        <dd class="mt-1 text-2xl font-semibold" data-testid="sections-behind">
          {data.sectionsBehindCount} / {data.sectionsTotal}
        </dd>
      </div>
      <div class="rounded-lg border border-slate-200 p-4">
        <dt class="text-sm text-slate-500">Communication</dt>
        <dd class="mt-1 text-lg font-medium">{formatReplyRate(data.communicationReplyWithinDayRate)}</dd>
      </div>
      <div class="rounded-lg border border-slate-200 p-4 sm:col-span-2">
        <dt class="text-sm text-slate-500">Coverage by section (fresh outcomes)</dt>
        <dd class="mt-2 space-y-1 text-sm">
          {#each data.coverageBySection as row}
            <p>{row.sectionName} — {row.childrenWithFreshOutcomes} children</p>
          {/each}
        </dd>
      </div>
      <div class="rounded-lg border border-slate-200 p-4 sm:col-span-2">
        <dt class="text-sm text-slate-500">Needs support (stalled count)</dt>
        <dd class="mt-2 space-y-1 text-sm">
          {#each data.needsSupportBySection as row}
            <p>{row.sectionName} — {row.stalledCount}</p>
          {/each}
        </dd>
      </div>
    </dl>
  {/if}
  {#if error}
    <p class="mt-4 text-sm text-red-700" role="alert">{error}</p>
  {/if}
</main>
