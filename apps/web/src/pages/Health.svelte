<script lang="ts">
  import { onMount } from 'svelte';
  import { link } from '@keenmate/svelte-spa-router';
  import { getApiBaseUrl } from '../lib/shared/api/client';
  import { getHealth, type HealthResponse } from '../features/health/api';

  let loading = $state(true);
  let error = $state<string | null>(null);
  let health = $state<HealthResponse | null>(null);

  onMount(async () => {
    try {
      health = await getHealth();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading = false;
    }
  });
</script>

<main class="mx-auto min-h-screen max-w-2xl px-4 py-12">
  <a use:link href="/" class="text-sm font-medium text-emerald-700 hover:underline">
    ← Back
  </a>

  <div class="mt-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
    <h1 class="text-2xl font-semibold text-slate-900">API health</h1>
    <p class="mt-2 text-sm text-slate-500">Source: {getApiBaseUrl()}/health</p>

    {#if loading}
      <p class="mt-6 text-slate-600">Checking API…</p>
    {:else if error}
      <div class="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        {error}
      </div>
    {:else if health}
      <dl class="mt-6 space-y-3 text-sm">
        <div class="flex justify-between gap-4 border-b border-slate-100 pb-3">
          <dt class="text-slate-500">Status</dt>
          <dd class="font-medium text-slate-900">{health.status}</dd>
        </div>
        {#if health.database}
          <div class="flex justify-between gap-4 border-b border-slate-100 pb-3">
            <dt class="text-slate-500">Database configured</dt>
            <dd class="font-medium text-slate-900">{health.database.configured}</dd>
          </div>
          <div class="flex justify-between gap-4 border-b border-slate-100 pb-3">
            <dt class="text-slate-500">Database ok</dt>
            <dd class="font-medium text-slate-900">{health.database.ok}</dd>
          </div>
          <div class="flex justify-between gap-4">
            <dt class="text-slate-500">School count</dt>
            <dd class="font-medium text-slate-900">{health.database.schoolCount ?? '—'}</dd>
          </div>
        {/if}
      </dl>
      <pre
        class="mt-6 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100"
      >{JSON.stringify(health, null, 2)}</pre>
    {/if}
  </div>
</main>
