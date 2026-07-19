<script lang="ts">
  import { onMount } from 'svelte';
  import AdminNav from '../shared/AdminNav.svelte';
  import Alert from '../shared/Alert.svelte';
  import { toErrorMessage } from '../../lib/shared/errors';
  import { getAdminOpenLoopCounts } from './api';
  import {
    adminOpenLoopSummary,
    assertAdminCountsSafe,
    type AdminOpenLoopCountsShape,
  } from './remedial-logic';

  let counts = $state<AdminOpenLoopCountsShape | null>(null);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      const payload = await getAdminOpenLoopCounts();
      if (!assertAdminCountsSafe(payload)) {
        error = 'Admin payload violated gravity rule (names/distributions)';
        return;
      }
      counts = payload;
    } catch (err) {
      error = toErrorMessage(err, 'Failed to load open-loop counts');
    }
  });
</script>

<AdminNav />
<main class="mx-auto max-w-2xl px-4 py-8">
  <h1 class="text-2xl font-semibold text-slate-900">Remedial open loops</h1>
  <p class="mt-1 text-sm text-slate-600">Counts only — never child names or rating distributions.</p>

  {#if counts}
    <section class="mt-6 rounded-lg border border-slate-200 p-4" data-testid="admin-open-loops">
      <p class="text-lg font-medium text-slate-900">{adminOpenLoopSummary(counts)}</p>
    </section>
  {/if}

  <Alert message={error} class="mt-4" />
</main>
