<script lang="ts">
  import { onMount } from 'svelte';
  import {
    resolveConfirm,
    subscribeConfirm,
    type ActiveConfirm,
  } from '../confirm';
  import ConfirmDialog from './ConfirmDialog.svelte';

  let active = $state<ActiveConfirm | null>(null);

  onMount(() => subscribeConfirm((next) => {
    active = next;
  }));
</script>

{#if active}
  <ConfirmDialog
    title={active.title}
    message={active.message}
    confirmLabel={active.confirmLabel}
    cancelLabel={active.cancelLabel}
    variant={active.variant}
    onConfirm={() => resolveConfirm(true)}
    onCancel={() => resolveConfirm(false)}
  />
{/if}
