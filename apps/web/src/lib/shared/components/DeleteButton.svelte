<script lang="ts">
  import { confirmDelete } from '../confirm';

  type Props = {
    label?: string;
    confirmTitle: string;
    confirmMessage: string;
    confirmLabel?: string;
    onConfirm: () => void | Promise<void>;
    class?: string;
    disabled?: boolean;
    testId?: string;
  };

  let {
    label = 'Delete',
    confirmTitle,
    confirmMessage,
    confirmLabel,
    onConfirm,
    class: className = '',
    disabled = false,
    testId,
  }: Props = $props();

  let busy = $state(false);

  const handleClick = async () => {
    if (busy || disabled) return;
    const ok = await confirmDelete({
      title: confirmTitle,
      message: confirmMessage,
      confirmLabel,
    });
    if (!ok) return;
    busy = true;
    try {
      await onConfirm();
    } finally {
      busy = false;
    }
  };
</script>

<button
  type="button"
  class={`text-rose-700 underline disabled:opacity-50 ${className}`}
  disabled={disabled || busy}
  data-testid={testId}
  onclick={handleClick}
>
  {label}
</button>
