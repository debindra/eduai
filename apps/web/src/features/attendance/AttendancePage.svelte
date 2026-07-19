<script lang="ts">
  import TeacherNav from '../shared/TeacherNav.svelte';
  import Alert from '../shared/Alert.svelte';
  import { toErrorMessage } from '../../lib/shared/errors';
  import { createAssignmentLoadGate } from '../../lib/shared/stores/assignment-load-gate';
  import { selectedAssignmentKey } from '../../lib/shared/stores/teacher-context';
  import { listAttendanceChildren, oneTapAttendance, type AttendanceChild } from './api';

  const loadGate = createAssignmentLoadGate();

  let day = $state(new Date().toISOString().slice(0, 10));
  let children = $state<AttendanceChild[]>([]);
  let statusByChild = $state<Record<string, string>>({});
  let loading = $state(true);
  let saving = $state(false);
  let message = $state<string | null>(null);
  let error = $state<string | null>(null);

  const load = async () => {
    const token = loadGate.begin($selectedAssignmentKey);
    if (token === null) return;
    loading = true;
    error = null;
    message = null;
    try {
      const result = await listAttendanceChildren(day);
      if (!loadGate.isCurrent(token)) return;
      children = result.children;
      statusByChild = Object.fromEntries(
        result.children.map((c) => [c.id, statusByChild[c.id] ?? 'present']),
      );
    } catch (err) {
      if (!loadGate.isCurrent(token)) return;
      error = toErrorMessage(err, 'Failed to load children');
      children = [];
    } finally {
      if (loadGate.isCurrent(token)) loading = false;
    }
  };

  $effect(() => {
    const key = $selectedAssignmentKey;
    const _day = day;
    if (!key) return;
    void load();
  });

  const handleSubmit = async () => {
    error = null;
    saving = true;
    try {
      await oneTapAttendance(
        day,
        children.map((c) => ({
          childId: c.id,
          status: statusByChild[c.id] ?? 'present',
        })),
      );
      message = 'Attendance saved — guardians notified.';
    } catch (err) {
      error = toErrorMessage(err, 'Attendance failed');
    } finally {
      saving = false;
    }
  };
</script>

<TeacherNav />
<main class="mx-auto max-w-lg px-4 py-8">
  <h1 class="text-2xl font-semibold text-slate-900">Attendance</h1>
  <input
    class="mt-4 rounded border px-2 py-1 text-sm"
    type="date"
    bind:value={day}
    aria-label="Attendance day"
  />

  {#if loading}
    <p class="mt-4 text-sm text-slate-500">Loading children…</p>
  {:else if children.length === 0}
    <p class="mt-4 text-sm text-slate-500">No active children in this section.</p>
  {:else}
    <ul class="mt-4 space-y-2">
      {#each children as child}
        <li class="flex items-center justify-between text-sm">
          <span>#{child.rollNumber} {child.name}</span>
          <select
            class="rounded border px-2 py-1"
            value={statusByChild[child.id]}
            onchange={(event) => {
              statusByChild[child.id] = (event.currentTarget as HTMLSelectElement).value;
            }}
            aria-label={`Status ${child.name}`}
          >
            <option value="present">present</option>
            <option value="absent">absent</option>
            <option value="late">late</option>
            <option value="excused">excused</option>
          </select>
        </li>
      {/each}
    </ul>
    <button
      type="button"
      class="mt-6 rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50"
      disabled={saving || children.length === 0}
      onclick={handleSubmit}
    >
      Save attendance
    </button>
  {/if}

  <Alert variant="success" message={message} class="mt-3" />
  <Alert message={error} class="mt-3" />
</main>
