<script lang="ts">
  import { onMount } from 'svelte';
  import { link } from '@keenmate/svelte-spa-router';
  import active from '@keenmate/svelte-spa-router/active';
  import { push } from '@keenmate/svelte-spa-router/utils';
  import { clearSession, session } from '../../lib/shared/stores/session';
  import {
    assignmentLabel,
    assignmentOptionKey,
    clearTeacherContext,
    loadTeacherContext,
    selectAssignmentByKey,
    teacherContext,
  } from '../../lib/shared/stores/teacher-context';

  const links = [
    { href: '/teacher/attendance', label: 'Attendance' },
    { href: '/teacher/sweep', label: 'Sweep' },
    { href: '/teacher/weekly', label: 'Weekly' },
    { href: '/teacher/lesson', label: 'Lesson' },
    { href: '/teacher/pacing', label: 'Pacing' },
    { href: '/teacher/reports', label: 'Reports' },
    { href: '/teacher/subject', label: 'Subject' },
    { href: '/teacher/oversight', label: 'Oversight' },
    { href: '/teacher/remedial', label: 'Remedial' },
    { href: '/teacher/messaging', label: 'Inbox' },
    { href: '/teacher/manage', label: 'Manage' },
    { href: '/teacher/certification', label: 'Certification' },
    { href: '/teacher/community', label: 'Community' },
  ] as const;

  let contextError = $state<string | null>(null);

  onMount(() => {
    if ($session?.memberType === 'teacher' && !$teacherContext) {
      void loadTeacherContext().catch((err: unknown) => {
        contextError = err instanceof Error ? err.message : 'Failed to load teaching context';
      });
    }
  });

  const handleSelectionChange = (event: Event) => {
    const key = (event.currentTarget as HTMLSelectElement).value;
    selectAssignmentByKey(key);
  };

  const handleSignOut = async () => {
    clearTeacherContext();
    clearSession();
    await push('/login');
  };
</script>

<header class="border-b border-slate-200 bg-white">
  <div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
    <nav class="flex flex-wrap gap-1" aria-label="Teacher">
      {#each links as item}
        <a
          use:link
          use:active={{
            className: 'bg-emerald-50 font-medium text-emerald-800',
            inactiveClassName: 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
          }}
          href={item.href}
          class="rounded-md px-2.5 py-1.5 text-sm"
        >
          {item.label}
        </a>
      {/each}
    </nav>
    <div class="flex flex-wrap items-center gap-3 text-sm text-slate-600">
      {#if $teacherContext?.assignments.length}
        <label class="flex items-center gap-2">
          <span class="sr-only">Section and subject</span>
          <select
            class="max-w-[14rem] rounded-md border border-slate-300 px-2 py-1 text-slate-800"
            aria-label="Section and subject"
            value={$teacherContext.selected
              ? assignmentOptionKey($teacherContext.selected)
              : ''}
            onchange={handleSelectionChange}
          >
            {#each $teacherContext.assignments as assignment}
              <option value={assignmentOptionKey(assignment)}>
                {assignmentLabel(assignment)}
              </option>
            {/each}
          </select>
        </label>
      {/if}
      {#if $session}
        <span class="hidden sm:inline">{$session.identity.displayName ?? $session.identity.email}</span>
      {/if}
      <button
        type="button"
        class="rounded-md border border-slate-300 px-2.5 py-1 text-slate-700 hover:bg-slate-50"
        onclick={handleSignOut}
      >
        Sign out
      </button>
    </div>
  </div>
  {#if contextError}
    <p class="border-t border-red-100 bg-red-50 px-4 py-2 text-sm text-red-800" role="alert">
      {contextError}
    </p>
  {/if}
</header>
