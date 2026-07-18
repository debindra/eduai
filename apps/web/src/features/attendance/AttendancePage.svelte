<script lang="ts">
  import TeacherNav from '../shared/TeacherNav.svelte';
  import { oneTapAttendance } from './api';

  const children = [
    { id: '88888888-8888-8888-8888-888888888881', name: 'Aarav Sharma' },
    { id: '88888888-8888-8888-8888-888888888882', name: 'Priya Thapa' },
    { id: '88888888-8888-8888-8888-888888888883', name: 'Kabir Gurung' },
  ];

  let day = $state(new Date().toISOString().slice(0, 10));
  let statusByChild = $state<Record<string, string>>(
    Object.fromEntries(children.map((c) => [c.id, 'present'])),
  );
  let message = $state<string | null>(null);
  let error = $state<string | null>(null);

  const handleSubmit = async () => {
    error = null;
    try {
      await oneTapAttendance(
        day,
        children.map((c) => ({ childId: c.id, status: statusByChild[c.id] ?? 'present' })),
      );
      message = 'Attendance saved — guardians notified.';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Attendance failed';
    }
  };
</script>

<TeacherNav />
<main class="mx-auto max-w-lg px-4 py-8">
  <h1 class="text-2xl font-semibold text-slate-900">Attendance</h1>
  <input class="mt-4 rounded border px-2 py-1 text-sm" type="date" bind:value={day} aria-label="Attendance day" />
  <ul class="mt-4 space-y-2">
    {#each children as child}
      <li class="flex items-center justify-between text-sm">
        <span>{child.name}</span>
        <select class="rounded border px-2 py-1" bind:value={statusByChild[child.id]} aria-label={`Status ${child.name}`}>
          <option value="present">present</option>
          <option value="absent">absent</option>
          <option value="late">late</option>
          <option value="excused">excused</option>
        </select>
      </li>
    {/each}
  </ul>
  <button type="button" class="mt-6 rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white" onclick={handleSubmit}>
    Save attendance
  </button>
  {#if message}<p class="mt-3 text-sm text-emerald-800">{message}</p>{/if}
  {#if error}<p class="mt-3 text-sm text-red-700" role="alert">{error}</p>{/if}
</main>
