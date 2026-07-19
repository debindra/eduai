<script lang="ts">
  import { onMount } from 'svelte';
  import PlatformNav from '../shared/PlatformNav.svelte';
  import Alert from '../shared/Alert.svelte';
  import { toErrorMessage } from '../../lib/shared/errors';
  import { assertGravitySafe } from './platform-logic';
  import { listPlatformSchools, type PlatformSchool } from './api';

  let schools = $state<PlatformSchool[]>([]);
  let error = $state<string | null>(null);
  let loading = $state(true);

  onMount(async () => {
    try {
      const response = await listPlatformSchools();
      const violations = assertGravitySafe(response);
      if (violations.length > 0) {
        error = `Gravity violation in payload: ${violations.join(', ')}`;
      }
      schools = response.schools;
    } catch (err) {
      error = toErrorMessage(err, 'Failed to load schools');
    } finally {
      loading = false;
    }
  });
</script>

<PlatformNav />
<main class="mx-auto max-w-6xl px-4 py-8">
  <h1 class="text-2xl font-semibold text-slate-900">Tenant monitoring</h1>
  <p class="mt-1 text-sm text-slate-600">
    Counts and shapes only — no child names or rating distributions.
  </p>

  {#if loading}
    <p class="mt-6 text-sm text-slate-500">Loading…</p>
  {:else if error}
    <Alert message={error} class="mt-6" />
  {:else}
    <div class="mt-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table class="min-w-full text-left text-sm">
        <thead class="border-b border-slate-200 bg-slate-50 text-slate-600">
          <tr>
            <th class="px-4 py-3 font-medium">School</th>
            <th class="px-4 py-3 font-medium">Region</th>
            <th class="px-4 py-3 font-medium">Tier</th>
            <th class="px-4 py-3 font-medium">Bands</th>
            <th class="px-4 py-3 font-medium">Exit</th>
            <th class="px-4 py-3 font-medium">Sections</th>
            <th class="px-4 py-3 font-medium">Behind</th>
          </tr>
        </thead>
        <tbody>
          {#each schools as school (school.id)}
            <tr class="border-b border-slate-100">
              <td class="px-4 py-3 font-medium text-slate-900">{school.name}</td>
              <td class="px-4 py-3 text-slate-600">{school.region ?? '—'}</td>
              <td class="px-4 py-3 text-slate-600">{school.tier ?? '—'}</td>
              <td class="px-4 py-3 text-slate-600">{school.licensedBandRange ?? '—'}</td>
              <td class="px-4 py-3 text-slate-600">{school.exitStatus ?? '—'}</td>
              <td class="px-4 py-3 text-slate-900">{school.sectionsTotal}</td>
              <td class="px-4 py-3 text-slate-900">{school.sectionsBehind}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</main>
