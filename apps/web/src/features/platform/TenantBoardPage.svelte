<script lang="ts">
  import { onMount } from 'svelte';
  import { push } from '@keenmate/svelte-spa-router';
  import PlatformNav from '../shared/PlatformNav.svelte';
  import Alert from '../shared/Alert.svelte';
  import {
    assertGravitySafe,
    buildCreateTenantPayload,
    tenantCalendarActions,
    tenantCalendarActionLabel,
    validateCreateTenantForm,
    type TenantCalendarListAction,
  } from './platform-logic';
  import { toErrorMessage } from '../../lib/shared/errors';
  import {
    createPlatformSchool,
    ensurePlatformSchoolCalendarDraft,
    listPlatformSchools,
    type PlatformSchool,
  } from './api';

  type Props = {
    params?: Record<string, string>;
  };

  let { params: _params }: Props = $props();

  let schools = $state<PlatformSchool[]>([]);
  let error = $state<string | null>(null);
  let gravityWarning = $state<string | null>(null);
  let loading = $state(true);
  let submitting = $state(false);
  let showCreateModal = $state(false);

  let name = $state('');
  let region = $state('');
  let tier = $state('');
  let licensedBandRange = $state('');
  let adminEmail = $state('');
  let adminPhone = $state('');
  let adminDisplayName = $state('');

  const reload = async () => {
    const response = await listPlatformSchools();
    const nextSchools = Array.isArray(response?.schools) ? response.schools : [];
    const violations = assertGravitySafe(response);
    gravityWarning =
      violations.length > 0 ? `Gravity warning in payload: ${violations.join(', ')}` : null;
    schools = nextSchools;
  };

  onMount(async () => {
    try {
      await reload();
      error = null;
    } catch (err) {
      error = toErrorMessage(err, 'Failed to load schools');
      schools = [];
    } finally {
      loading = false;
    }
  });

  const resetForm = () => {
    name = '';
    region = '';
    tier = '';
    licensedBandRange = '';
    adminEmail = '';
    adminPhone = '';
    adminDisplayName = '';
  };

  const openCreateModal = () => {
    error = null;
    resetForm();
    showCreateModal = true;
  };

  const closeCreateModal = () => {
    if (submitting) return;
    showCreateModal = false;
  };

  const handleCreate = async (event: Event) => {
    event.preventDefault();
    error = null;
    const formError = validateCreateTenantForm({
      name,
      region,
      tier,
      licensedBandRange,
      adminEmail,
      adminPhone,
      adminDisplayName,
    });
    if (formError) {
      error = formError;
      return;
    }
    submitting = true;
    try {
      const result = await createPlatformSchool(
        buildCreateTenantPayload({
          name,
          region,
          tier,
          licensedBandRange,
          adminEmail,
          adminPhone,
          adminDisplayName,
        }),
      );
      showCreateModal = false;
      resetForm();
      await push(`/platform/schools/${result.school.id}/calendar`);
    } catch (err) {
      error = toErrorMessage(err, 'Failed to create tenant');
    } finally {
      submitting = false;
    }
  };

  const handleListCalendarAction = async (
    school: PlatformSchool,
    action: TenantCalendarListAction,
  ) => {
    error = null;
    if (action === 'edit') {
      submitting = true;
      try {
        await ensurePlatformSchoolCalendarDraft(school.id);
        await push(`/platform/schools/${school.id}/calendar`);
      } catch (err) {
        error = toErrorMessage(err, 'Failed to open calendar for editing');
      } finally {
        submitting = false;
      }
      return;
    }
    await push(`/platform/schools/${school.id}/calendar`);
  };
</script>

<PlatformNav />
<main class="mx-auto max-w-6xl space-y-8 px-4 py-8">
  <div class="flex flex-wrap items-start justify-between gap-4">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Tenant monitoring</h1>
      <p class="mt-1 text-sm text-slate-600">
        Counts and shapes only — no child names or rating distributions.
      </p>
    </div>
    <button
      type="button"
      class="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800"
      onclick={openCreateModal}
      data-testid="tenant-create-open"
    >
      Create tenant &amp; Continue
    </button>
  </div>

  <Alert message={error} testId="tenant-error" />
  <Alert message={gravityWarning} testId="tenant-gravity-warning" />

  {#if loading}
    <p class="text-sm text-slate-500" data-testid="tenant-loading">Loading…</p>
  {:else if schools.length === 0}
    <p
      class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600"
      data-testid="tenant-empty"
    >
      No schools found. Use Create tenant &amp; Continue to provision one.
    </p>
  {:else}
    <div
      class="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm"
      data-testid="tenant-table"
    >
      <table class="min-w-full text-left text-sm">
        <thead class="border-b border-slate-200 bg-slate-50 text-slate-600">
          <tr>
            <th class="px-4 py-3 font-medium">School</th>
            <th class="px-4 py-3 font-medium">Region</th>
            <th class="px-4 py-3 font-medium">Tier</th>
            <th class="px-4 py-3 font-medium">Calendar</th>
            <th class="px-4 py-3 font-medium">Sections</th>
            <th class="px-4 py-3 font-medium">Teachers</th>
            <th class="px-4 py-3 font-medium">Students</th>
            <th class="px-4 py-3 font-medium">Subjects</th>
            <th class="px-4 py-3 font-medium">Behind</th>
            <th class="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {#each schools as school (school.id)}
            <tr class="border-b border-slate-100">
              <td class="px-4 py-3 font-medium text-slate-900">{school.name}</td>
              <td class="px-4 py-3 text-slate-600">{school.region ?? '—'}</td>
              <td class="px-4 py-3 text-slate-600">{school.tier ?? '—'}</td>
              <td class="px-4 py-3 text-slate-600" data-testid={`calendar-status-${school.id}`}>
                {school.calendarStatus}
              </td>
              <td class="px-4 py-3 text-slate-900">{school.sectionsTotal}</td>
              <td class="px-4 py-3 text-slate-900">{school.teachersTotal}</td>
              <td class="px-4 py-3 text-slate-900">{school.studentsTotal}</td>
              <td class="px-4 py-3 text-slate-900">{school.subjectsTotal}</td>
              <td class="px-4 py-3 text-slate-900">{school.sectionsBehind}</td>
              <td class="px-4 py-3">
                <div class="flex flex-wrap gap-2">
                  {#each tenantCalendarActions(school.calendarStatus) as action (action)}
                    <button
                      type="button"
                      class="rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 hover:bg-slate-50 disabled:opacity-60"
                      disabled={submitting}
                      onclick={() => handleListCalendarAction(school, action)}
                      data-testid={`${action}-calendar-${school.id}`}
                    >
                      {tenantCalendarActionLabel(action)}
                    </button>
                  {/each}
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</main>

{#if showCreateModal}
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
    role="presentation"
    data-testid="tenant-create-modal"
  >
    <div
      class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tenant-create-title"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 id="tenant-create-title" class="text-lg font-semibold text-slate-900">
            Create tenant
          </h2>
          <p class="mt-1 text-sm text-slate-600">
            School details and first admin. After submit you’ll configure the calendar on the next
            page.
          </p>
        </div>
        <button
          type="button"
          class="rounded-lg px-2 py-1 text-slate-500 hover:bg-slate-100"
          onclick={closeCreateModal}
          aria-label="Close"
          data-testid="tenant-create-close"
        >
          ✕
        </button>
      </div>

      <form class="mt-4 grid gap-3" onsubmit={handleCreate}>
        <label class="text-sm">
          <span class="text-slate-700">School name</span>
          <input
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            bind:value={name}
            required
            data-testid="tenant-name"
          />
        </label>
        <label class="text-sm">
          <span class="text-slate-700">Region</span>
          <input
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            bind:value={region}
            data-testid="tenant-region"
          />
        </label>
        <label class="text-sm">
          <span class="text-slate-700">Tier</span>
          <input
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            bind:value={tier}
            placeholder="pilot"
            data-testid="tenant-tier"
          />
        </label>
        <label class="text-sm">
          <span class="text-slate-700">Licensed bands</span>
          <input
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            bind:value={licensedBandRange}
            placeholder="pre_primary,basic_early"
            data-testid="tenant-bands"
          />
        </label>
        <label class="text-sm">
          <span class="text-slate-700">Admin display name</span>
          <input
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            bind:value={adminDisplayName}
            data-testid="tenant-admin-name"
          />
        </label>
        <label class="text-sm">
          <span class="text-slate-700">Admin email</span>
          <input
            type="email"
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            bind:value={adminEmail}
            data-testid="tenant-admin-email"
          />
        </label>
        <label class="text-sm">
          <span class="text-slate-700">Admin phone (instead of email)</span>
          <input
            class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            bind:value={adminPhone}
            data-testid="tenant-admin-phone"
          />
        </label>
        <div class="mt-2 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg border border-slate-300 px-4 py-2 text-sm"
            onclick={closeCreateModal}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={submitting}
            data-testid="tenant-create-submit"
          >
            {submitting ? 'Creating…' : 'Create tenant & Continue'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}
