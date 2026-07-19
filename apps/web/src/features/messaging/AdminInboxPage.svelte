<script lang="ts">
  import { onMount } from 'svelte';
  import AdminNav from '../shared/AdminNav.svelte';
  import Alert from '../shared/Alert.svelte';
  import { toErrorMessage } from '../../lib/shared/errors';
  import { listAdminQueue } from './api';
  import { queueLabel, type MessageRow } from './messaging-logic';

  let rows = $state<MessageRow[]>([]);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      rows = await listAdminQueue();
    } catch (err) {
      error = toErrorMessage(err, 'Failed to load admin queue');
    }
  });
</script>

<AdminNav />

<main class="mx-auto max-w-2xl px-4 py-8">
  <h1 class="text-2xl font-semibold text-slate-900">Admin messaging queue</h1>
  <p class="mt-1 text-sm text-slate-600">Fees and complaints — never routed to teachers.</p>
  <ul class="mt-6 space-y-3" data-testid="admin-inbox">
    {#each rows as msg}
      <li class="rounded-lg border border-slate-200 p-4">
        <p class="text-xs uppercase text-slate-500">{queueLabel(msg.intentRoute)}</p>
        <p class="mt-1 text-sm">{msg.contentRef}</p>
      </li>
    {:else}
      <li class="text-sm text-slate-500">Queue empty.</li>
    {/each}
  </ul>
  <Alert message={error} class="mt-4" />
</main>
