<script lang="ts">
  import { onMount } from 'svelte';
  import TeacherNav from '../shared/TeacherNav.svelte';
  import { getMoments } from './api';
  import { methodLabel, type CommunityFeed } from './community-logic';

  let feed = $state<CommunityFeed | null>(null);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      feed = await getMoments();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load community moments';
    }
  });
</script>

<TeacherNav />
<main class="mx-auto max-w-2xl px-4 py-8">
  <h1 class="text-xl font-semibold text-slate-900">Community</h1>
  <p class="mt-1 text-sm text-slate-600">
    Shareable teaching moments and method ideas from the community.
  </p>

  {#if error}
    <p class="mt-6 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" data-testid="community-error">
      {error}
    </p>
  {:else if !feed}
    <p class="mt-6 text-sm text-slate-500">Loading…</p>
  {:else}
    <ul class="mt-6 space-y-3">
      {#each feed.moments as moment (moment.id)}
        <li class="rounded-lg border border-slate-200 bg-white p-4" data-testid="community-moment">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-sm font-medium text-slate-900">{moment.title}</h2>
            <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
              {methodLabel(moment.method)}
            </span>
          </div>
          <p class="mt-2 text-sm text-slate-600">{moment.body}</p>
        </li>
      {/each}
    </ul>
  {/if}
</main>
