<script lang="ts">
  import { onMount } from 'svelte';
  import AdminNav from '../shared/AdminNav.svelte';
  import Alert from '../shared/Alert.svelte';
  import { toErrorMessage } from '../../lib/shared/errors';
  import {
    ECA_CCA_ICON_KEYS,
    iconGlyph,
    type EcaCcaIconKey,
    type EcaCcaKind,
  } from '../eca-cca/eca-cca-icons';
  import {
    catalogAvailableToEnable,
    catalogFormValid,
    type CatalogItem,
    type SchoolEcaCcaItem,
  } from '../eca-cca/eca-cca-logic';
  import {
    createSchoolOnlyEcaCca,
    deleteSchoolEcaCcaItem,
    enableSchoolEcaCcaCatalogItem,
    getAdminFestivalPlanner,
    getAdminSettlingProgramme,
    getSchoolEcaCcaBundle,
    patchSchoolEcaCcaItem,
  } from './api';
  import {
    adminFestivalHeadline,
    type AdminFestivalPlannerShape,
    type SettlingProgrammeShape,
  } from './manage-logic';

  let plan = $state<AdminFestivalPlannerShape | null>(null);
  let settling = $state<SettlingProgrammeShape | null>(null);
  let catalog = $state<CatalogItem[]>([]);
  let schoolItems = $state<SchoolEcaCcaItem[]>([]);
  let error = $state<string | null>(null);
  let message = $state<string | null>(null);

  let onlyName = $state('');
  let onlyKind = $state<EcaCcaKind>('eca');
  let onlyIcon = $state<EcaCcaIconKey>('sports');

  const available = $derived(catalogAvailableToEnable(catalog, schoolItems));
  const canCreateOnly = $derived(
    catalogFormValid({ name: onlyName, kind: onlyKind, iconKey: onlyIcon }),
  );

  const reloadEca = async () => {
    const bundle = await getSchoolEcaCcaBundle();
    catalog = bundle.catalog;
    schoolItems = bundle.schoolItems;
  };

  onMount(async () => {
    try {
      [plan, settling] = await Promise.all([
        getAdminFestivalPlanner(),
        getAdminSettlingProgramme(),
      ]);
      await reloadEca();
    } catch (err) {
      error = toErrorMessage(err, 'Failed to load');
    }
  });

  const handleEnable = async (catalogId: string) => {
    try {
      await enableSchoolEcaCcaCatalogItem(catalogId);
      await reloadEca();
      message = 'Catalog item enabled for this school';
    } catch (err) {
      error = toErrorMessage(err, 'Enable failed');
    }
  };

  const handleToggle = async (item: SchoolEcaCcaItem) => {
    try {
      await patchSchoolEcaCcaItem(item.id, { isActive: !item.isActive });
      await reloadEca();
    } catch (err) {
      error = toErrorMessage(err, 'Update failed');
    }
  };

  const handleDelete = async (item: SchoolEcaCcaItem) => {
    if (!confirm(`Remove “${item.name}” from this school?`)) return;
    try {
      await deleteSchoolEcaCcaItem(item.id);
      await reloadEca();
    } catch (err) {
      error = toErrorMessage(err, 'Delete failed');
    }
  };

  const handleCreateOnly = async () => {
    if (!canCreateOnly) return;
    try {
      await createSchoolOnlyEcaCca({
        name: onlyName.trim(),
        kind: onlyKind,
        iconKey: onlyIcon,
      });
      onlyName = '';
      await reloadEca();
      message = 'School-only activity added';
    } catch (err) {
      error = toErrorMessage(err, 'Create failed');
    }
  };
</script>

<AdminNav />

<main class="mx-auto max-w-2xl px-4 py-8">
  <h1 class="text-2xl font-semibold text-slate-900">School manage</h1>
  <p class="mt-1 text-sm text-slate-600">
    Festival planner, settling programme, and ECA/CCA activities.
  </p>
  {#if plan}
    <p class="mt-4 text-sm" data-testid="admin-festival">{adminFestivalHeadline(plan)}</p>
    <ul class="mt-2 space-y-1 text-sm text-slate-700">
      {#each plan.festivals as f}
        <li>{f.name}: {f.startDate} – {f.endDate}</li>
      {/each}
    </ul>
  {/if}
  {#if settling}
    <p class="mt-4 text-sm text-slate-600" data-testid="admin-settling">
      {settling.steps.length} settling weeks configured
    </p>
  {/if}

  <section class="mt-8" data-testid="school-eca-cca">
    <h2 class="text-lg font-medium text-slate-900">ECA / CCA</h2>
    <p class="mt-1 text-sm text-slate-600">
      Enable from the platform catalog or add a school-only activity. Place them on the calendar.
    </p>

    <h3 class="mt-4 text-sm font-medium text-slate-800">Enabled for this school</h3>
    <ul class="mt-2 space-y-2">
      {#each schoolItems as item (item.id)}
        <li
          class="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <span>
            <span class="mr-1 rounded bg-slate-100 px-1 text-xs">{iconGlyph(item.iconKey)}</span>
            {item.name}
            <span class="ml-1 text-xs uppercase text-slate-500">{item.kind}</span>
            {#if item.isSchoolOnly}
              <span class="ml-1 text-xs text-slate-500">(school-only)</span>
            {/if}
            {#if !item.isActive}
              <span class="ml-1 text-xs text-amber-700">off</span>
            {/if}
          </span>
          <span class="flex gap-2">
            <button type="button" class="underline" onclick={() => handleToggle(item)}>
              {item.isActive ? 'Disable' : 'Enable'}
            </button>
            <button type="button" class="text-rose-700 underline" onclick={() => handleDelete(item)}>
              Remove
            </button>
          </span>
        </li>
      {:else}
        <li class="text-sm text-slate-500">None enabled yet.</li>
      {/each}
    </ul>

    {#if available.length > 0}
      <h3 class="mt-4 text-sm font-medium text-slate-800">Enable from catalog</h3>
      <ul class="mt-2 space-y-2">
        {#each available as row (row.id)}
          <li
            class="flex items-center justify-between rounded-lg border border-dashed border-slate-200 px-3 py-2 text-sm"
          >
            <span>
              <span class="mr-1 rounded bg-slate-100 px-1 text-xs">{iconGlyph(row.iconKey)}</span>
              {row.name}
            </span>
            <button
              type="button"
              class="rounded-md bg-slate-900 px-2 py-1 text-xs text-white"
              onclick={() => handleEnable(row.id)}
            >
              Enable
            </button>
          </li>
        {/each}
      </ul>
    {/if}

    <h3 class="mt-4 text-sm font-medium text-slate-800">Add school-only</h3>
    <div class="mt-2 grid gap-2 sm:grid-cols-3">
      <input
        class="rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-3"
        placeholder="Name"
        bind:value={onlyName}
        data-testid="school-only-name"
      />
      <select class="rounded-lg border border-slate-300 px-3 py-2 text-sm" bind:value={onlyKind}>
        <option value="eca">ECA</option>
        <option value="cca">CCA</option>
      </select>
      <select class="rounded-lg border border-slate-300 px-3 py-2 text-sm" bind:value={onlyIcon}>
        {#each ECA_CCA_ICON_KEYS as key}
          <option value={key}>{iconGlyph(key)}</option>
        {/each}
      </select>
      <button
        type="button"
        class="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
        disabled={!canCreateOnly}
        onclick={handleCreateOnly}
        data-testid="school-only-save"
      >
        Add
      </button>
    </div>
  </section>

  <Alert message={error} class="mt-4" />
  {#if message}
    <p class="mt-2 text-sm text-emerald-700">{message}</p>
  {/if}
</main>
