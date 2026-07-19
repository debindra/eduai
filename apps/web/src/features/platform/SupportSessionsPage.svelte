<script lang="ts">
  import { onMount } from 'svelte';
  import { push } from '@keenmate/svelte-spa-router';
  import PlatformNav from '../shared/PlatformNav.svelte';
  import Alert from '../shared/Alert.svelte';
  import { toErrorMessage } from '../../lib/shared/errors';
  import { setSupportSession } from '../../lib/shared/stores/support-session';
  import { ECA_CCA_LABEL } from '../calendar/calendar-markers-logic';
  import {
    createSupportSession,
    listPlatformSchools,
    listSupportSessions,
    revokeSupportSession,
    type PlatformSchool,
    type SupportSession,
  } from './api';

  let schools = $state<PlatformSchool[]>([]);
  let sessions = $state<SupportSession[]>([]);
  let schoolId = $state('');
  let reason = $state('');
  let grantedBy = $state('');
  let error = $state<string | null>(null);

  const reload = async () => {
    const [schoolRes, sessionRes] = await Promise.all([
      listPlatformSchools(),
      listSupportSessions(),
    ]);
    schools = schoolRes.schools;
    sessions = sessionRes.sessions;
    if (!schoolId && schools[0]) schoolId = schools[0].id;
  };

  onMount(async () => {
    try {
      await reload();
    } catch (err) {
      error = toErrorMessage(err, 'Failed to load');
    }
  });

  const handleCreate = async () => {
    error = null;
    try {
      const session = await createSupportSession({
        schoolId,
        reason,
        grantedBy: grantedBy || undefined,
        expiresInHours: 4,
      });
      setSupportSession({
        sessionId: session.id,
        schoolId: session.schoolId,
        schoolName: session.schoolName,
        expiresAt: session.expiresAt,
      });
      await reload();
      reason = '';
    } catch (err) {
      error = toErrorMessage(err, 'Create failed');
    }
  };

  const handleEnter = (session: SupportSession) => {
    setSupportSession({
      sessionId: session.id,
      schoolId: session.schoolId,
      schoolName: session.schoolName,
      expiresAt: session.expiresAt,
    });
    push(`/admin/calendar`);
  };

  const handleRevoke = async (id: string) => {
    error = null;
    try {
      await revokeSupportSession(id);
      await reload();
    } catch (err) {
      error = toErrorMessage(err, 'Revoke failed');
    }
  };
</script>

<PlatformNav />
<main class="mx-auto max-w-6xl space-y-6 px-4 py-8">
  <div>
    <h1 class="text-2xl font-semibold text-slate-900">Support sessions</h1>
    <p class="mt-1 text-sm text-slate-600">
      Time-boxed, consented drill-down into one school. Enter opens that school’s admin calendar
      (setup, holidays, {ECA_CCA_LABEL}). Every access is audited.
    </p>
  </div>

  <Alert message={error} />

  <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h2 class="font-medium text-slate-900">Open session</h2>
    <div class="mt-3 grid gap-3 md:grid-cols-2">
      <label class="text-sm">
        School
        <select class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" bind:value={schoolId}>
          {#each schools as school (school.id)}
            <option value={school.id}>{school.name}</option>
          {/each}
        </select>
      </label>
      <label class="text-sm">
        Granted by
        <input class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" bind:value={grantedBy} />
      </label>
      <label class="text-sm md:col-span-2">
        Reason
        <input
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          required
          minlength="3"
          bind:value={reason}
        />
      </label>
    </div>
    <button
      type="button"
      class="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
      onclick={handleCreate}
    >
      Create (4h)
    </button>
  </section>

  <section class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
    <h2 class="font-medium text-slate-900">Sessions</h2>
    <ul class="mt-3 space-y-3">
      {#each sessions as session (session.id)}
        <li class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-3 text-sm">
          <div>
            <div class="font-medium text-slate-900">
              {session.schoolName ?? session.schoolId}
              <span class="ml-2 text-xs uppercase text-slate-500">{session.status}</span>
            </div>
            <div class="text-xs text-slate-500">{session.reason}</div>
            <div class="text-xs text-slate-400">
              Expires {new Date(session.expiresAt).toLocaleString()}
            </div>
          </div>
          <div class="flex gap-2">
            {#if session.status === 'active'}
              <button
                type="button"
                class="rounded-lg bg-violet-700 px-3 py-1.5 text-white"
                onclick={() => handleEnter(session)}
              >
                Enter calendar
              </button>
              <button
                type="button"
                class="rounded-lg border border-slate-300 px-3 py-1.5"
                onclick={() => handleRevoke(session.id)}
              >
                Revoke
              </button>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  </section>
</main>
