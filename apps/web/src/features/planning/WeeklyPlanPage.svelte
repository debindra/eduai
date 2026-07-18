<script lang="ts">
  import { onMount } from 'svelte';
  import TeacherNav from '../shared/TeacherNav.svelte';
  import { adjustWeekly, getWeekly, type WeeklyPlanDay } from './api';

  let weekStart = $state<string | null>(null);
  let days = $state<WeeklyPlanDay[]>([]);
  let loading = $state(true);
  let saving = $state(false);
  let error = $state<string | null>(null);
  let editDate = $state('');
  let editTheme = $state('');
  let editNotes = $state('');

  onMount(async () => {
    try {
      const weekly = await getWeekly();
      weekStart = weekly.weekStart;
      days = weekly.days;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load weekly plan';
    } finally {
      loading = false;
    }
  });

  const handleAdjust = async () => {
    error = null;
    saving = true;
    try {
      const weekly = await adjustWeekly(editDate, editTheme, editNotes || undefined);
      weekStart = weekly.weekStart;
      days = weekly.days;
      editDate = '';
      editTheme = '';
      editNotes = '';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Adjust failed';
    } finally {
      saving = false;
    }
  };
</script>

<TeacherNav />
<main class="mx-auto max-w-3xl px-4 py-8">
  <h1 class="text-2xl font-semibold text-slate-900">Weekly plan</h1>
  <p class="mt-1 text-sm text-slate-600">
    {#if weekStart}Week of {weekStart} — {/if}Sunday glance — adjust a day without regenerating the map.
  </p>

  {#if loading}
    <p class="mt-6 text-sm text-slate-500">Loading…</p>
  {:else}
    <ul class="mt-6 space-y-2">
      {#each days as day}
        <li class="border-b border-slate-100 py-2 text-sm">
          <div class="flex justify-between">
            <span>{day.date}</span>
            <span>{day.themeOrChapter ?? '—'}{day.overridden ? ' (adjusted)' : ''}</span>
          </div>
          {#if day.notes}
            <p class="mt-1 text-xs text-slate-500">Note: {day.notes}</p>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}

  <div class="mt-6 flex flex-wrap gap-2">
    <input
      class="rounded border px-2 py-1 text-sm"
      type="date"
      bind:value={editDate}
      aria-label="Day date"
    />
    <input class="rounded border px-2 py-1 text-sm" placeholder="Theme" bind:value={editTheme} aria-label="Theme" />
    <input class="rounded border px-2 py-1 text-sm" placeholder="Notes (optional)" bind:value={editNotes} aria-label="Notes" />
    <button
      type="button"
      class="rounded-lg bg-emerald-700 px-3 py-1 text-sm text-white disabled:opacity-50"
      disabled={saving || !editDate || !editTheme}
      onclick={handleAdjust}
    >
      {saving ? 'Saving…' : 'Save adjust'}
    </button>
  </div>

  {#if error}
    <p class="mt-4 text-sm text-red-700" role="alert">{error}</p>
  {/if}
</main>
