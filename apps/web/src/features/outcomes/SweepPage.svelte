<script lang="ts">
  import TeacherNav from '../shared/TeacherNav.svelte';
  import Alert from '../shared/Alert.svelte';
  import { toErrorMessage } from '../../lib/shared/errors';
  import { createAssignmentLoadGate } from '../../lib/shared/stores/assignment-load-gate';
  import { selectedAssignmentKey } from '../../lib/shared/stores/teacher-context';
  import {
    confirmOutcome,
    getSweepContext,
    proposeBatchSweep,
    type SweepContextOutcome,
  } from './api';
  import { allowedSweepRatings, buildSweepConfirmPayload, type SweepRow } from './sweep-logic';

  const loadGate = createAssignmentLoadGate();

  let rows = $state<SweepRow[]>([]);
  let outcomes = $state<SweepContextOutcome[]>([]);
  let selectedOutcomeId = $state<string>('');
  let currentSweepProposalIds = $state<string[]>([]);
  let loading = $state(true);
  let busy = $state(false);
  let message = $state<string | null>(null);
  let error = $state<string | null>(null);

  const ratings = allowedSweepRatings();

  const load = async () => {
    const token = loadGate.begin($selectedAssignmentKey);
    if (token === null) return;
    loading = true;
    error = null;
    message = null;
    currentSweepProposalIds = [];
    try {
      const ctx = await getSweepContext();
      if (!loadGate.isCurrent(token)) return;
      outcomes = ctx.outcomes;
      const outcomeId = ctx.outcomes[0]?.outcomeId ?? '';
      selectedOutcomeId = outcomeId;
      rows = ctx.children.map((c) => ({
        childId: c.childId,
        childName: c.name,
        outcomeId,
        ratingCode: 'not_yet' as const,
      }));
    } catch (err) {
      if (!loadGate.isCurrent(token)) return;
      error = toErrorMessage(err, 'Failed to load sweep context');
      rows = [];
      outcomes = [];
    } finally {
      if (loadGate.isCurrent(token)) loading = false;
    }
  };

  $effect(() => {
    const key = $selectedAssignmentKey;
    if (!key) return;
    void load();
  });

  const handleOutcomeChange = (event: Event) => {
    const outcomeId = (event.currentTarget as HTMLSelectElement).value;
    selectedOutcomeId = outcomeId;
    rows = rows.map((r) => ({ ...r, outcomeId }));
  };

  const handlePropose = async () => {
    busy = true;
    error = null;
    try {
      const result = await proposeBatchSweep(buildSweepConfirmPayload(rows));
      currentSweepProposalIds = result.proposed.map((p) => p.id);
      message = `Proposed ${result.proposed.length} milestones — review and confirm.`;
    } catch (err) {
      error = toErrorMessage(err, 'Propose failed');
    } finally {
      busy = false;
    }
  };

  const handleConfirmAll = async () => {
    if (currentSweepProposalIds.length === 0) {
      error = 'No proposals from this sweep to confirm';
      return;
    }
    busy = true;
    error = null;
    try {
      for (const proposalId of currentSweepProposalIds) {
        await confirmOutcome(proposalId);
      }
      message = `Confirmed ${currentSweepProposalIds.length} milestones from this sweep.`;
      currentSweepProposalIds = [];
    } catch (err) {
      error = toErrorMessage(err, 'Confirm failed');
    } finally {
      busy = false;
    }
  };
</script>

<TeacherNav />
<main class="mx-auto max-w-3xl px-4 py-8">
  <h1 class="text-2xl font-semibold text-slate-900">Milestone batch sweep</h1>
  <p class="mt-1 text-sm text-slate-600">Propose first, then confirm — the level is human.</p>

  {#if loading}
    <p class="mt-6 text-sm text-slate-500">Loading roster…</p>
  {:else}
    {#if outcomes.length > 0}
      <label class="mt-4 block text-sm text-slate-700">
        Milestone
        <select
          class="mt-1 w-full rounded border border-slate-300 px-2 py-1"
          aria-label="Milestone"
          value={selectedOutcomeId}
          onchange={handleOutcomeChange}
        >
          {#each outcomes as outcome}
            <option value={outcome.outcomeId}>{outcome.code}: {outcome.statement}</option>
          {/each}
        </select>
      </label>
    {/if}

    {#if rows.length === 0}
      <p class="mt-6 text-sm text-slate-500">No active children in this section.</p>
    {:else}
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
          disabled={busy || !selectedOutcomeId}
          onclick={handlePropose}
        >
          Propose sweep
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
          disabled={busy || currentSweepProposalIds.length === 0}
          onclick={handleConfirmAll}
        >
          Confirm this sweep ({currentSweepProposalIds.length})
        </button>
      </div>
    {/if}
  {/if}

  <Alert variant="success" message={message} class="mt-4" />
  <Alert message={error} class="mt-4" />
</main>
