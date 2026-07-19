<script lang="ts">
  import { onMount } from 'svelte';
  import PlatformNav from '../shared/PlatformNav.svelte';
  import Alert from '../shared/Alert.svelte';
  import { toErrorMessage } from '../../lib/shared/errors';
  import {
    ECA_CCA_ICON_KEYS,
    iconGlyph,
    type EcaCcaIconKey,
    type EcaCcaKind,
  } from '../eca-cca/eca-cca-icons';
  import { catalogFormValid } from '../eca-cca/eca-cca-logic';
  import {
    createEcaCcaCatalogItem,
    deleteEcaCcaCatalogItem,
    listEcaCcaCatalog,
    updateEcaCcaCatalogItem,
    type EcaCcaCatalogItem,
  } from './api';

  let items = $state<EcaCcaCatalogItem[]>([]);
  let error = $state<string | null>(null);
  let message = $state<string | null>(null);
  let saving = $state(false);

  let name = $state('');
  let kind = $state<EcaCcaKind>('eca');
  let iconKey = $state<EcaCcaIconKey>('sports');
  let editingId = $state<string | null>(null);

  const canSave = $derived(catalogFormValid({ name, kind, iconKey }));

  const reload = async () => {
    const response = await listEcaCcaCatalog(true);
    items = response.items;
  };

  onMount(async () => {
    try {
      await reload();
    } catch (err) {
      error = toErrorMessage(err, 'Failed to load catalog');
    }
  });

  const resetForm = () => {
    editingId = null;
    name = '';
    kind = 'eca';
    iconKey = 'sports';
  };

  const startEdit = (item: EcaCcaCatalogItem) => {
    editingId = item.id;
    name = item.name;
    kind = item.kind;
    iconKey = (ECA_CCA_ICON_KEYS.includes(item.iconKey as EcaCcaIconKey)
      ? item.iconKey
      : 'sports') as EcaCcaIconKey;
    message = null;
    error = null;
  };

  const handleSave = async () => {
    if (!canSave || saving) return;
    saving = true;
    error = null;
    try {
      if (editingId) {
        await updateEcaCcaCatalogItem(editingId, { name, kind, iconKey });
        message = 'Catalog item updated';
      } else {
        await createEcaCcaCatalogItem({ name, kind, iconKey });
        message = 'Catalog item created';
      }
      resetForm();
      await reload();
    } catch (err) {
      error = toErrorMessage(err, 'Save failed');
    } finally {
      saving = false;
    }
  };

  const handleToggleActive = async (item: EcaCcaCatalogItem) => {
    try {
      await updateEcaCcaCatalogItem(item.id, { isActive: !item.isActive });
      await reload();
    } catch (err) {
      error = toErrorMessage(err, 'Update failed');
    }
  };

  const handleDelete = async (item: EcaCcaCatalogItem) => {
    if (!confirm(`Soft-delete “${item.name}”?`)) return;
    try {
      await deleteEcaCcaCatalogItem(item.id);
      if (editingId === item.id) resetForm();
      await reload();
      message = 'Catalog item deleted';
    } catch (err) {
      error = toErrorMessage(err, 'Delete failed');
    }
  };
</script>

<PlatformNav />

<main class="mx-auto max-w-3xl px-4 py-8">
  <h1 class="text-2xl font-semibold text-slate-900">ECA / CCA catalog</h1>
  <p class="mt-1 text-sm text-slate-600">
    Platform-owned list. Schools enable items or add school-only activities.
  </p>

  <section class="mt-6 rounded-xl border border-slate-200 bg-white p-4">
    <h2 class="text-sm font-medium text-slate-800">
      {editingId ? 'Edit item' : 'Add item'}
    </h2>
    <div class="mt-3 grid gap-3 sm:grid-cols-2">
      <label class="block text-sm text-slate-700 sm:col-span-2">
        Name
        <input
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          bind:value={name}
          data-testid="catalog-name"
        />
      </label>
      <label class="block text-sm text-slate-700">
        Kind
        <select
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          bind:value={kind}
        >
          <option value="eca">ECA</option>
          <option value="cca">CCA</option>
        </select>
      </label>
      <label class="block text-sm text-slate-700">
        Icon
        <select
          class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          bind:value={iconKey}
          data-testid="catalog-icon"
        >
          {#each ECA_CCA_ICON_KEYS as key}
            <option value={key}>{iconGlyph(key)} ({key})</option>
          {/each}
        </select>
      </label>
    </div>
    <div class="mt-3 flex gap-2">
      <button
        type="button"
        class="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={!canSave || saving}
        onclick={handleSave}
        data-testid="catalog-save"
      >
        {editingId ? 'Update' : 'Create'}
      </button>
      {#if editingId}
        <button
          type="button"
          class="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          onclick={resetForm}
        >
          Cancel
        </button>
      {/if}
    </div>
  </section>

  <ul class="mt-6 space-y-2" data-testid="catalog-list">
    {#each items as item (item.id)}
      <li
        class="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3"
      >
        <div>
          <p class="text-sm font-medium text-slate-900">
            <span class="mr-2 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700"
              >{iconGlyph(item.iconKey)}</span
            >
            {item.name}
            <span class="ml-2 text-xs uppercase text-slate-500">{item.kind}</span>
            {#if !item.isActive}
              <span class="ml-2 text-xs text-amber-700">inactive</span>
            {/if}
          </p>
        </div>
        <div class="flex flex-wrap gap-2 text-sm">
          <button type="button" class="text-slate-700 underline" onclick={() => startEdit(item)}>
            Edit
          </button>
          <button
            type="button"
            class="text-slate-700 underline"
            onclick={() => handleToggleActive(item)}
          >
            {item.isActive ? 'Deactivate' : 'Activate'}
          </button>
          <button type="button" class="text-rose-700 underline" onclick={() => handleDelete(item)}>
            Delete
          </button>
        </div>
      </li>
    {:else}
      <li class="text-sm text-slate-500">No catalog items yet.</li>
    {/each}
  </ul>

  <Alert message={error} class="mt-4" />
  {#if message}
    <p class="mt-2 text-sm text-emerald-700">{message}</p>
  {/if}
</main>
