<script lang="ts">
  /**
   * Inline error/success banner. Renders nothing when message is empty, so
   * callers can pass a nullable state value directly instead of wrapping in
   * their own `{#if}`.
   */
  type Props = {
    variant?: 'error' | 'success';
    message: string | null | undefined;
    class?: string;
    testId?: string;
  };

  let { variant = 'error', message, class: className = '', testId }: Props = $props();

  const styles = {
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  } as const;
</script>

{#if message}
  <p
    role={variant === 'error' ? 'alert' : 'status'}
    data-testid={testId}
    class={`rounded-lg border px-3 py-2 text-sm ${styles[variant]} ${className}`}
  >
    {message}
  </p>
{/if}
