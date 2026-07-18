<script lang="ts">
  import TeacherNav from '../shared/TeacherNav.svelte';
  import { approveReport, draftMonthlyReport } from './api';
  import { reportUiBranch } from './report-logic';

  let childId = $state('88888888-8888-8888-8888-888888888881');
  let draftId = $state<string | null>(null);
  let bodyText = $state<string | null>(null);
  let thinData = $state(false);
  let evidence = $state<unknown>([]);
  let error = $state<string | null>(null);

  const handleDraft = async () => {
    error = null;
    try {
      const draft = await draftMonthlyReport({
        childId,
        periodStart: '2025-04-01',
        periodEnd: '2025-04-30',
      });
      draftId = draft.id;
      bodyText = draft.bodyText;
      thinData = draft.thinData;
      evidence = draft.evidenceSnapshot;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Draft failed';
    }
  };

  const handleApprove = async () => {
    if (!draftId) return;
    error = null;
    try {
      await approveReport(draftId);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Approve failed';
    }
  };
</script>

<TeacherNav />
<main class="mx-auto max-w-4xl px-4 py-8">
  <h1 class="text-2xl font-semibold text-slate-900">Parent report review</h1>
  <p class="mt-1 text-sm text-slate-600">Evidence beside draft — approve does not regenerate.</p>

  <button type="button" class="mt-4 rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white" onclick={handleDraft}>
    Draft monthly report
  </button>

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
    <button type="button" class="mt-4 rounded-lg border px-3 py-2 text-sm" onclick={handleApprove}>
      Approve
    </button>
  {/if}

  {#if error}
    <p class="mt-4 text-sm text-red-700" role="alert">{error}</p>
  {/if}
</main>
