<script lang="ts">
  import { onMount } from 'svelte';
  import { getTeachingDays } from './api';

  type TerminalRow = {
    terminalId: string;
    terminalName: string;
    teachingDayCount: number;
  };

  let loading = $state(true);
  let error = $state<string | null>(null);
  let schoolId = $state<string | null>(null);
  let terminals = $state<TerminalRow[]>([]);

  onMount(async () => {
    try {
      const response = await getTeachingDays();
      schoolId = response.schoolId;
      terminals = response.terminals;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Could not load teaching days';
    } finally {
      loading = false;
    }
  });
</script>

<section class="rounded-xl border border-slate-200 bg-slate-50 p-4">
  <h2 class="text-lg font-semibold text-slate-900">Teaching days</h2>
  <p class="mt-1 text-sm text-slate-600">
    Derived on read from calendar span minus weekly offs and closures.
  </p>

  {#if loading}
    <p class="mt-4 text-sm text-slate-600">Loading…</p>
  {:else if error}
    <p class="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      {error}
    </p>
  {:else}
    {#if schoolId}
      <p class="mt-3 text-xs text-slate-500">School: {schoolId}</p>
    {/if}
    <dl class="mt-4 space-y-2">
      {#each terminals as terminal (terminal.terminalId)}
        <div class="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
          <dt class="font-medium text-slate-800">{terminal.terminalName}</dt>
          <dd class="tabular-nums text-slate-600">{terminal.teachingDayCount} days</dd>
        </div>
      {:else}
        <p class="text-sm text-slate-500">No terminals yet.</p>
      {/each}
    </dl>
  {/if}
</section>
