<script lang="ts">
  import TeacherNav from '../shared/TeacherNav.svelte';
  import Alert from '../shared/Alert.svelte';
  import { toErrorMessage } from '../../lib/shared/errors';
  import { createAssignmentLoadGate } from '../../lib/shared/stores/assignment-load-gate';
  import {
    getSelectedSubjectId,
    selectedAssignmentKey,
  } from '../../lib/shared/stores/teacher-context';
  import {
    confirmRating,
    listAreaIndicators,
    listAssessmentAreas,
    listSweepChildren,
    proposeIndicatorBatch,
    type AssessmentArea,
    type IndicatorRow,
  } from './api';
  import {
    allowedIndicatorSweepRatings,
    buildIndicatorSweepPayload,
    type IndicatorSweepRow,
  } from './indicator-sweep-logic';

  const loadGate = createAssignmentLoadGate();
  /** Pilot default: Grade 4 English areas. */
  const LEVEL_ID = 4;

  let areas = $state<AssessmentArea[]>([]);
  let selectedAreaId = $state('');
  let indicators = $state<IndicatorRow[]>([]);
  let selectedIndicatorId = $state('');
  let rows = $state<IndicatorSweepRow[]>([]);
  let proposalIds = $state<string[]>([]);
  let loading = $state(true);
  let busy = $state(false);
  let message = $state<string | null>(null);
  let error = $state<string | null>(null);

  const ratings = allowedIndicatorSweepRatings();

  const load = async () => {
    const token = loadGate.begin($selectedAssignmentKey);
    if (token === null) return;
    loading = true;
    error = null;
    message = null;
    proposalIds = [];
    try {
      if (!getSelectedSubjectId()) {
        throw new Error('Select a subject assignment (e.g. Grade 4 English)');
      }
      const [areaList, children] = await Promise.all([
        listAssessmentAreas(LEVEL_ID),
        listSweepChildren(),
      ]);
      if (!loadGate.isCurrent(token)) return;
      areas = areaList;
      const areaId = areaList[0]?.id ?? '';
      selectedAreaId = areaId;
      if (!areaId) {
        indicators = [];
        rows = [];
        return;
      }
      const detail = await listAreaIndicators(areaId);
      if (!loadGate.isCurrent(token)) return;
      indicators = detail.indicators;
      const indicatorId = detail.indicators[0]?.id ?? '';
      selectedIndicatorId = indicatorId;
      rows = children.map((c) => ({
        childId: c.childId,
        childName: c.name,
        indicatorId,
        rating: 2 as const,
        groupLabel: detail.indicators[0]?.group_label ?? null,
      }));
    } catch (err) {
      if (!loadGate.isCurrent(token)) return;
      error = toErrorMessage(err, 'Failed to load indicator sweep');
      areas = [];
      indicators = [];
      rows = [];
    } finally {
      if (loadGate.isCurrent(token)) loading = false;
    }
  };

  $effect(() => {
    const key = $selectedAssignmentKey;
    if (!key) return;
    void load();
  });

  const handleAreaChange = async (event: Event) => {
    const areaId = (event.currentTarget as HTMLSelectElement).value;
    selectedAreaId = areaId;
    busy = true;
    error = null;
    try {
      const detail = await listAreaIndicators(areaId);
      indicators = detail.indicators;
      const indicatorId = detail.indicators[0]?.id ?? '';
      selectedIndicatorId = indicatorId;
      rows = rows.map((r) => ({
        ...r,
        indicatorId,
        groupLabel: detail.indicators[0]?.group_label ?? null,
      }));
    } catch (err) {
      error = toErrorMessage(err, 'Failed to load indicators');
    } finally {
      busy = false;
    }
  };

  const handleIndicatorChange = (event: Event) => {
    const indicatorId = (event.currentTarget as HTMLSelectElement).value;
    selectedIndicatorId = indicatorId;
    const ind = indicators.find((i) => i.id === indicatorId);
    rows = rows.map((r) => ({
      ...r,
      indicatorId,
      groupLabel: ind?.group_label ?? null,
    }));
  };

  const handlePropose = async () => {
    busy = true;
    error = null;
    try {
      const result = await proposeIndicatorBatch(buildIndicatorSweepPayload(rows));
      proposalIds = result.proposed.map((p) => p.id);
      message = `Proposed ${result.proposed.length} indicator ratings — review and confirm.`;
    } catch (err) {
      error = toErrorMessage(err, 'Propose failed');
    } finally {
      busy = false;
    }
  };

  const handleConfirmAll = async () => {
    if (proposalIds.length === 0) {
      error = 'No proposals from this sweep to confirm';
      return;
    }
    busy = true;
    error = null;
    try {
      for (const id of proposalIds) {
        await confirmRating(id);
      }
      message = `Confirmed ${proposalIds.length} indicator ratings.`;
      proposalIds = [];
    } catch (err) {
      error = toErrorMessage(err, 'Confirm failed');
    } finally {
      busy = false;
    }
  };
</script>

<TeacherNav />
<main class="mx-auto max-w-3xl px-4 py-8">
  <h1 class="text-2xl font-semibold text-slate-900">Indicator sweep (G1–5)</h1>
  <p class="mt-1 text-sm text-slate-600">
    Rate indicators (not §3 outcomes). Propose first, then confirm. Top rating 4 is blocked in batch sweep.
  </p>

  {#if loading}
    <p class="mt-6 text-sm text-slate-500">Loading areas…</p>
  {:else}
    {#if areas.length > 0}
      <label class="mt-4 block text-sm text-slate-700">
        Assessment area
        <select
          class="mt-1 w-full rounded border border-slate-300 px-2 py-1"
          aria-label="Assessment area"
          value={selectedAreaId}
          onchange={handleAreaChange}
        >
          {#each areas as area}
            <option value={area.id}
              >{area.display_label} ({area.code}) · N={area.indicator_count}</option
            >
          {/each}
        </select>
      </label>
    {/if}

    {#if indicators.length > 0}
      <label class="mt-4 block text-sm text-slate-700">
        Indicator
        <select
          class="mt-1 w-full rounded border border-slate-300 px-2 py-1"
          aria-label="Indicator"
          value={selectedIndicatorId}
          onchange={handleIndicatorChange}
        >
          {#each indicators as ind}
            <option value={ind.id}
              >{ind.group_label ? `${ind.group_label} · ` : ''}{ind.code}: {ind.statement_en}</option
            >
          {/each}
        </select>
      </label>
    {/if}

    {#if rows.length === 0}
      <p class="mt-6 text-sm text-slate-500">
        No children or no assessment areas for this subject at level {LEVEL_ID}.
      </p>
    {:else}
      <table class="mt-6 w-full text-left text-sm">
        <thead>
          <tr class="border-b border-slate-200 text-slate-500">
            <th class="py-2">Child</th>
            <th class="py-2">Rating (1–3)</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row, i}
            <tr class="border-b border-slate-100">
              <td class="py-3">{row.childName}</td>
              <td class="py-3">
                <select
                  class="rounded border border-slate-300 px-2 py-1"
                  bind:value={rows[i].rating}
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
          disabled={busy || !selectedIndicatorId}
          onclick={handlePropose}
        >
          Propose sweep
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-50"
          disabled={busy || proposalIds.length === 0}
          onclick={handleConfirmAll}
        >
          Confirm this sweep ({proposalIds.length})
        </button>
      </div>
    {/if}
  {/if}

  <Alert variant="success" message={message} class="mt-4" />
  <Alert message={error} class="mt-4" />
</main>
