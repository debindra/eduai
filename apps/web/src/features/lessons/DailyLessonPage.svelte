<script lang="ts">
  import TeacherNav from '../shared/TeacherNav.svelte';
  import Alert from '../shared/Alert.svelte';
  import { toErrorMessage } from '../../lib/shared/errors';
  import { ApiError } from '../../lib/shared/api/client';
  import { createAssignmentLoadGate } from '../../lib/shared/stores/assignment-load-gate';
  import { selectedAssignmentKey } from '../../lib/shared/stores/teacher-context';
  import { generateLesson, getDaily, markLessonDone } from './api';

  const loadGate = createAssignmentLoadGate();

  let date = $state(new Date().toISOString().slice(0, 10));
  let theme = $state<string | null>(null);
  let mapSliceId = $state<string | null>(null);
  let lesson = $state<{ pedagogyType: string; theme: string } | null>(null);
  let error = $state<string | null>(null);
  let notATeachingDay = $state(false);

  const load = async () => {
    const token = loadGate.begin($selectedAssignmentKey);
    if (token === null) return;
    error = null;
    notATeachingDay = false;
    theme = null;
    mapSliceId = null;
    try {
      const daily = await getDaily(date);
      if (!loadGate.isCurrent(token)) return;
      theme = daily.themeOrChapter;
      mapSliceId = daily.mapSliceId;
    } catch (err) {
      if (!loadGate.isCurrent(token)) return;
      if (err instanceof ApiError && err.status === 404) {
        notATeachingDay = true;
      } else {
        error = toErrorMessage(err, 'Load failed');
      }
    }
  };

  $effect(() => {
    const key = $selectedAssignmentKey;
    const _date = date;
    if (!key) return;
    void load();
  });

  const handleGenerate = async () => {
    error = null;
    try {
      const result = await generateLesson(date);
      lesson = { pedagogyType: result.pedagogyType, theme: result.theme };
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        notATeachingDay = true;
      } else {
        error = toErrorMessage(err, 'Generate failed');
      }
    }
  };

  const handleDone = async () => {
    if (!mapSliceId) return;
    error = null;
    try {
      await markLessonDone(mapSliceId);
    } catch (err) {
      error = toErrorMessage(err, 'Mark done failed');
    }
  };
</script>

<TeacherNav />
<main class="mx-auto max-w-3xl px-4 py-8">
  <h1 class="text-2xl font-semibold text-slate-900">Daily lesson</h1>
  <p class="mt-1 text-sm text-slate-600">Pre-filled from the weekly cell — coverage separate from learning.</p>

  <input class="mt-4 rounded border px-2 py-1 text-sm" type="date" bind:value={date} aria-label="Lesson date" />

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
  <Alert message={error} class="mt-4" />
</main>
