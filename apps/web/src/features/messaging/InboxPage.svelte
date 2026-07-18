<script lang="ts">
  import { onMount } from 'svelte';
  import TeacherNav from '../shared/TeacherNav.svelte';
  import { approveDraft, listTeacherDrafts } from './api';
  import { isDraftPending, type MessageRow } from './messaging-logic';

  let drafts = $state<MessageRow[]>([]);
  let error = $state<string | null>(null);
  let busyId = $state<string | null>(null);

  onMount(async () => {
    try {
      drafts = await listTeacherDrafts();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load inbox';
    }
  });

  async function handleApprove(id: string) {
    busyId = id;
    try {
      await approveDraft(id);
      drafts = drafts.filter((d) => d.id !== id);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Approve failed';
    } finally {
      busyId = null;
    }
  }
</script>

<TeacherNav />
<main class="mx-auto max-w-2xl px-4 py-8">
  <h1 class="text-2xl font-semibold text-slate-900">Messaging inbox</h1>
  <p class="mt-1 text-sm text-slate-600">Approve draft replies — nothing sends without your confirmation.</p>

  <ul class="mt-6 space-y-3" data-testid="teacher-inbox">
    {#each drafts as msg}
      <li class="rounded-lg border border-slate-200 p-4">
        <p class="text-sm text-slate-500">{msg.contentRef}</p>
        {#if isDraftPending(msg)}
          <p class="mt-2 text-sm text-slate-800" data-testid="draft-reply">{msg.draftReply}</p>
          <button
            type="button"
            class="mt-3 rounded-md bg-emerald-700 px-3 py-1.5 text-sm text-white hover:bg-emerald-800 disabled:opacity-50"
            disabled={busyId === msg.id}
            onclick={() => handleApprove(msg.id)}
          >
            Approve &amp; send
          </button>
        {/if}
      </li>
    {:else}
      <li class="text-sm text-slate-500">No drafts waiting.</li>
    {/each}
  </ul>
  {#if error}
    <p class="mt-4 text-sm text-red-700" role="alert">{error}</p>
  {/if}
</main>
