<script lang="ts">
  import { onMount } from 'svelte';
  import TeacherNav from '../shared/TeacherNav.svelte';
  import { adjustWeekly, getWeekly } from './api';

  let days = $state<Array<{ date: string; themeOrChapter: string | null; overridden: boolean }>>([]);
  let error = $state<string | null>(null);
  let editDate = $state('');
  let editTheme = $state('');

  onMount(async () => {
    try {
      const weekly = await getWeekly();
      days = weekly.days;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load weekly plan';
    }
  });

  const handleAdjust = async () => {
    error = null;
    try {
      const weekly = await adjustWeekly(editDate, editTheme);
      days = weekly.days;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Adjust failed';
    }
  };
</script>

<TeacherNav />
<main class="mx-auto max-w-3xl px-4 py-8">
  <h1 class="text-2xl font-semibold text-slate-900">Weekly plan</h1>
  <p class="mt-1 text-sm text-slate-600">Sunday glance — adjust a day without regenerating the map.</p>

  <ul class="mt-6 space-y-2">
    {#each days as day}
      <li class="flex justify-between border-b border-slate-100 py-2 text-sm">
        <span>{day.date}</span>
        <span>{day.themeOrChapter ?? '—'}{day.overridden ? ' (adjusted)' : ''}</span>
      </li>
    {/each}
  </ul>

  <div class="mt-6 flex flex-wrap gap-2">
    <input class="rounded border px-2 py-1 text-sm" placeholder="YYYY-MM-DD" bind:value={editDate} aria-label="Day date" />
    <input class="rounded border px-2 py-1 text-sm" placeholder="Theme" bind:value={editTheme} aria-label="Theme" />
    <button type="button" class="rounded-lg bg-emerald-700 px-3 py-1 text-sm text-white" onclick={handleAdjust}>
      Save adjust
    </button>
  </div>

  {#if error}
    <p class="mt-4 text-sm text-red-700" role="alert">{error}</p>
  {/if}
</main>
