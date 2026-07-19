<script lang="ts">
  import { onMount } from 'svelte';
  import TeacherNav from '../shared/TeacherNav.svelte';
  import Alert from '../shared/Alert.svelte';
  import { toErrorMessage } from '../../lib/shared/errors';
  import { getMyCertification } from './api';
  import {
    certificationStatusLabel,
    observationStatusLabel,
    progressSummary,
    weekStatusLabel,
    type CertificationView,
  } from './certification-logic';

  let view = $state<CertificationView | null>(null);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      view = await getMyCertification();
    } catch (err) {
      error = toErrorMessage(err, 'Failed to load certification progress');
    }
  });
</script>

<TeacherNav />
<main class="mx-auto max-w-2xl px-4 py-8">
  <h1 class="text-xl font-semibold text-slate-900">Certification</h1>
  <p class="mt-1 text-sm text-slate-600">
    12-week WhatsApp credential programme — weekly quiz plus one observed session.
  </p>

  {#if error}
    <Alert message={error} class="mt-6" testId="cert-error" />
  {:else if !view}
    <p class="mt-6 text-sm text-slate-500">Loading…</p>
  {:else}
    <section class="mt-6 rounded-lg border border-slate-200 bg-white p-4" data-testid="cert-summary">
      <div class="flex items-center justify-between">
        <span class="text-sm font-medium text-slate-700">Overall</span>
        <span class="rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-800">
          {certificationStatusLabel(view.status)}
        </span>
      </div>
      <p class="mt-2 text-sm text-slate-600">{progressSummary(view)}</p>
      <p class="mt-1 text-sm text-slate-600">
        Observation: {observationStatusLabel(view.observation.status)}
      </p>
    </section>

    <ul class="mt-6 space-y-2">
      {#each view.weeks as week (week.week)}
        <li
          class="flex items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2"
          data-testid="cert-week"
        >
          <span class="text-sm text-slate-700">Week {week.week}</span>
          <span
            class="text-sm"
            class:text-emerald-700={week.status === 'quiz_passed'}
            class:text-amber-700={week.status === 'quiz_failed'}
            class:text-slate-500={week.status === 'not_started'}
          >
            {weekStatusLabel(week.status)}
          </span>
        </li>
      {/each}
    </ul>
  {/if}
</main>
