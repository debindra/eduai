<script lang="ts">
  import TeacherNav from '../shared/TeacherNav.svelte';
  import { confirmOutcome, listProposed, proposeBatchSweep } from './api';
  import { allowedSweepRatings, buildSweepConfirmPayload, type SweepRow } from './sweep-logic';

  const PLACEHOLDER_OUTCOME = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

  let rows = $state<SweepRow[]>([
    { childId: '88888888-8888-8888-8888-888888888881', childName: 'Aarav Sharma', outcomeId: PLACEHOLDER_OUTCOME, ratingCode: 'emerging' },
    { childId: '88888888-8888-8888-8888-888888888882', childName: 'Priya Thapa', outcomeId: PLACEHOLDER_OUTCOME, ratingCode: 'developing' },
    { childId: '88888888-8888-8888-8888-888888888883', childName: 'Kabir Gurung', outcomeId: PLACEHOLDER_OUTCOME, ratingCode: 'emerging' },
  ]);
  let currentSweepProposalIds = $state<string[]>([]);
  let message = $state<string | null>(null);
  let error = $state<string | null>(null);
  let loading = $state(false);

  const ratings = allowedSweepRatings();

  const handlePropose = async () => {
    loading = true;
    error = null;
    try {
      const result = await proposeBatchSweep(buildSweepConfirmPayload(rows));
      currentSweepProposalIds = result.proposed.map((p) => p.id);
      message = `Proposed ${result.proposed.length} milestones — review and confirm.`;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Propose failed';
    } finally {
      loading = false;
    }
  };

  const handleConfirmAll = async () => {
    if (currentSweepProposalIds.length === 0) {
      error = 'No proposals from this sweep to confirm';
      return;
    }
    loading = true;
    error = null;
    try {
      for (const proposalId of currentSweepProposalIds) {
        await confirmOutcome(proposalId);
      }
      message = `Confirmed ${currentSweepProposalIds.length} milestones from this sweep.`;
      currentSweepProposalIds = [];
    } catch (err) {
      error = err instanceof Error ? err.message : 'Confirm failed';
    } finally {
      loading = false;
    }
  };
</script>

<TeacherNav />
<main class="mx-auto max-w-3xl px-4 py-8">
  <h1 class="text-2xl font-semibold text-slate-900">Milestone batch sweep</h1>
  <p class="mt-1 text-sm text-slate-600">Propose first, then confirm — the level is human.</p>

  <table class="mt-6 w-full text-left text-sm">
    <thead>
      <tr class="border-b border-slate-200 text-slate-500">
        <th class="py-2">Child</th>
        <th class="py-2">Rating</th>
      </tr>
    </thead>
    <tbody>
      {#each rows as row, i}
        <tr class="border-b border-slate-100">
          <td class="py-3">{row.childName}</td>
          <td class="py-3">
            <select
              class="rounded border border-slate-300 px-2 py-1"
              bind:value={rows[i].ratingCode}
              aria-label={`Rating for ${row.childName}`}
            >
              {#each ratings as r}
                <option value={r}>{r}</option>
              {/each}
            </select>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>

  <div class="mt-6 flex gap-3">
    <button
      type="button"
      class="rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50"
      disabled={loading}
      onclick={handlePropose}
    >
      Propose sweep
    </button>
    <button
      type="button"
      class="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
      disabled={loading || currentSweepProposalIds.length === 0}
      onclick={handleConfirmAll}
    >
      Confirm this sweep ({currentSweepProposalIds.length})
    </button>
  </div>

  {#if message}
    <p class="mt-4 text-sm text-emerald-800">{message}</p>
  {/if}
  {#if error}
    <p class="mt-4 text-sm text-red-700" role="alert">{error}</p>
  {/if}
</main>
