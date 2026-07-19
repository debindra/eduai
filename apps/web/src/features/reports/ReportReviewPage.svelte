<script lang="ts">
  import TeacherNav from '../shared/TeacherNav.svelte';
  import { createAssignmentLoadGate } from '../../lib/shared/stores/assignment-load-gate';
  import { selectedAssignmentKey } from '../../lib/shared/stores/teacher-context';
  import { listSectionChildren, type AttendanceChild } from '../attendance/api';
  import { approveReport, draftMonthlyReport } from './api';
  import { currentMonthPeriod, reportUiBranch } from './report-logic';

  const loadGate = createAssignmentLoadGate();

  let children = $state<AttendanceChild[]>([]);
  let childId = $state('');
  let draftId = $state<string | null>(null);
  let bodyText = $state<string | null>(null);
  let thinData = $state(false);
  let evidence = $state<unknown>([]);
  let loading = $state(true);
  let busy = $state(false);
  let error = $state<string | null>(null);

  const period = currentMonthPeriod();

  const loadChildren = async () => {
    const token = loadGate.begin($selectedAssignmentKey);
    if (token === null) return;
    loading = true;
    error = null;
    draftId = null;
    bodyText = null;
    try {
      const result = await listSectionChildren();
      if (!loadGate.isCurrent(token)) return;
      children = result.children;
      childId = result.children[0]?.id ?? '';
    } catch (err) {
      if (!loadGate.isCurrent(token)) return;
      error = err instanceof Error ? err.message : 'Failed to load children';
      children = [];
      childId = '';
    } finally {
      if (loadGate.isCurrent(token)) loading = false;
    }
  };

  $effect(() => {
    const key = $selectedAssignmentKey;
    if (!key) return;
    void loadChildren();
  });

  const handleDraft = async () => {
    if (!childId) {
      error = 'Select a child first';
      return;
    }
    error = null;
    busy = true;
    try {
      const draft = await draftMonthlyReport({
        childId,
        periodStart: period.periodStart,
        periodEnd: period.periodEnd,
      });
      draftId = draft.id;
      bodyText = draft.bodyText;
      thinData = draft.thinData;
      evidence = draft.evidenceSnapshot;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Draft failed';
    } finally {
      busy = false;
    }
  };

  const handleApprove = async () => {
    if (!draftId) return;
    error = null;
    busy = true;
    try {
      await approveReport(draftId);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Approve failed';
    } finally {
      busy = false;
    }
  };
</script>

<TeacherNav />
<main class="mx-auto max-w-4xl px-4 py-8">
  <h1 class="text-2xl font-semibold text-slate-900">Parent report review</h1>
  <p class="mt-1 text-sm text-slate-600">Evidence beside draft — approve does not regenerate.</p>

  {#if loading}
    <p class="mt-4 text-sm text-slate-500">Loading children…</p>
  {:else}
    <label class="mt-4 block text-sm text-slate-700">
      Child
      <select
        class="mt-1 w-full max-w-md rounded border border-slate-300 px-2 py-1"
        aria-label="Child"
        bind:value={childId}
      >
        {#each children as child}
          <option value={child.id}>#{child.rollNumber} {child.name}</option>
        {/each}
      </select>
    </label>
    <p class="mt-2 text-xs text-slate-500">
      Period: {period.periodStart} → {period.periodEnd}
    </p>

    <button
      type="button"
      class="mt-4 rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50"
      disabled={busy || !childId}
      onclick={handleDraft}
    >
      Draft monthly report
    </button>
  {/if}

  {#if bodyText !== null}
    <div class="mt-6 grid gap-6 md:grid-cols-2">
      <section>
        <h2 class="text-sm font-medium text-slate-500">Draft ({reportUiBranch(thinData)})</h2>
        <p class="mt-2 whitespace-pre-wrap text-sm text-slate-800">{bodyText}</p>
      </section>
      <section>
        <h2 class="text-sm font-medium text-slate-500">Evidence</h2>
        <pre class="mt-2 overflow-auto rounded bg-slate-50 p-3 text-xs">{JSON.stringify(evidence, null, 2)}</pre>
      </section>
    </div>
    <button
      type="button"
      class="mt-4 rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
      disabled={busy}
      onclick={handleApprove}
    >
      Approve
    </button>
  {/if}

  {#if error}
    <p class="mt-4 text-sm text-red-700" role="alert">{error}</p>
  {/if}
</main>
