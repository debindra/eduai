<script lang="ts">
  import TeachingDays from '../TeachingDays.svelte';

  type Props = {
    approvedYearLabel: string | null;
    loading: boolean;
    onApprove: () => void;
  };

  let { approvedYearLabel, loading, onApprove }: Props = $props();
</script>

<div class="mt-6 space-y-4">
  <p class="text-sm text-slate-600">
    {#if approvedYearLabel}
      Calendar for {approvedYearLabel} is approved.
    {:else}
      Approve the calendar when terminals and closures look correct.
    {/if}
  </p>
  <button
    type="button"
    disabled={loading || approvedYearLabel !== null}
    onclick={onApprove}
    class="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
  >
    {loading ? 'Approving…' : approvedYearLabel ? 'Already approved' : 'Approve calendar'}
  </button>
  <TeachingDays />
</div>
