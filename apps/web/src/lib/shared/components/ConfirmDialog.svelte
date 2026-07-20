<script lang="ts">
  import { onMount } from 'svelte';

  type Props = {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'default';
    onConfirm: () => void;
    onCancel: () => void;
  };

  let {
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default',
    onConfirm,
    onCancel,
  }: Props = $props();

  let cancelEl: HTMLButtonElement | undefined = $state();

  const confirmClass = $derived(
    variant === 'danger'
      ? 'rounded-lg bg-rose-700 px-3 py-2 text-sm font-medium text-white hover:bg-rose-800'
      : 'rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800',
  );

  onMount(() => {
    cancelEl?.focus();
  });

  $effect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });
</script>

<!-- Overlay dismiss is mouse/pointer; Escape is handled on window. -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
  role="presentation"
  data-testid="confirm-dialog-overlay"
  onclick={onCancel}
>
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-labelledby="confirm-dialog-title"
    data-testid="confirm-dialog"
    data-variant={variant}
    onclick={(e) => e.stopPropagation()}
  >
    <h2 id="confirm-dialog-title" class="text-lg font-semibold text-slate-900">
      {title}
    </h2>
    <p class="mt-2 text-sm text-slate-600">{message}</p>
    <div class="mt-6 flex justify-end gap-2">
      <button
        type="button"
        bind:this={cancelEl}
        class="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        data-testid="confirm-dialog-cancel"
        onclick={onCancel}
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        class={confirmClass}
        data-testid="confirm-dialog-confirm"
        onclick={onConfirm}
      >
        {confirmLabel}
      </button>
    </div>
  </div>
</div>
