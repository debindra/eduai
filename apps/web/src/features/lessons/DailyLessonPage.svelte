<script lang="ts">
  import { onMount } from 'svelte';
  import TeacherNav from '../shared/TeacherNav.svelte';
  import { ApiError } from '../../lib/shared/api/client';
  import { generateLesson, getDaily, markLessonDone } from './api';

  let date = $state(new Date().toISOString().slice(0, 10));
  let theme = $state<string | null>(null);
  let mapSliceId = $state<string | null>(null);
  let lesson = $state<{ pedagogyType: string; theme: string } | null>(null);
  let error = $state<string | null>(null);
  let notATeachingDay = $state(false);

  const load = async () => {
    error = null;
    notATeachingDay = false;
    theme = null;
    mapSliceId = null;
    try {
      const daily = await getDaily(date);
      theme = daily.themeOrChapter;
      mapSliceId = daily.mapSliceId;
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        notATeachingDay = true;
      } else {
        error = err instanceof Error ? err.message : 'Load failed';
      }
    }
  };

  onMount(load);

  const handleGenerate = async () => {
    error = null;
    try {
      const result = await generateLesson(date);
      lesson = { pedagogyType: result.pedagogyType, theme: result.theme };
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        notATeachingDay = true;
      } else {
        error = err instanceof Error ? err.message : 'Generate failed';
      }
    }
  };

  const handleDone = async () => {
    if (!mapSliceId) return;
    error = null;
    try {
      await markLessonDone(mapSliceId);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Mark done failed';
    }
  };
</script>

<TeacherNav />
<main class="mx-auto max-w-3xl px-4 py-8">
  <h1 class="text-2xl font-semibold text-slate-900">Daily lesson</h1>
  <p class="mt-1 text-sm text-slate-600">Pre-filled from the weekly cell — coverage separate from learning.</p>

  <input class="mt-4 rounded border px-2 py-1 text-sm" type="date" bind:value={date} onchange={load} aria-label="Lesson date" />

  {#if notATeachingDay}
    <p class="mt-2 text-sm text-slate-500" role="status">No school on this day — not a teaching day.</p>
  {:else}
    <p class="mt-2 text-sm text-slate-700">Theme: {theme ?? '—'}</p>
  {/if}

  <div class="mt-4 flex gap-2">
    <button
      type="button"
      class="rounded-lg bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50"
      disabled={notATeachingDay}
      onclick={handleGenerate}
    >
      Generate lesson
    </button>
    <button
      type="button"
      class="rounded-lg border px-3 py-2 text-sm disabled:opacity-50"
      disabled={notATeachingDay || !mapSliceId}
      onclick={handleDone}
    >
      Mark taught
    </button>
  </div>

  {#if lesson}
    <p class="mt-4 text-sm">Pedagogy: {lesson.pedagogyType} · {lesson.theme}</p>
  {/if}
  {#if error}
    <p class="mt-4 text-sm text-red-700" role="alert">{error}</p>
  {/if}
</main>
