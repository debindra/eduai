<script lang="ts">
  import NepaliDatePicker from '../../shared/NepaliDatePicker.svelte';
  import type { LocalClosure, NationalClosure } from '../calendar-wizard-logic';

  type Props = {
    bsYear: number | null;
    nationalClosures: NationalClosure[];
    closures: LocalClosure[];
    loading: boolean;
    onContinue: () => void;
  };

  let {
    bsYear,
    nationalClosures,
    closures = $bindable(),
    loading,
    onContinue,
  }: Props = $props();

  const addLocalClosure = () => {
    closures = [...closures, { name: '', startDate: '', endDate: '' }];
  };

  const removeLocalClosure = (index: number) => {
    closures = closures.filter((_, i) => i !== index);
  };
</script>

<div class="mt-6 space-y-4">
  {#if bsYear}
    <p class="text-sm text-slate-600">National closures for BS {bsYear} (read-only):</p>
  {/if}
  {#each nationalClosures as closure (closure.id)}
    <div class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm">
      <div class="font-medium text-amber-950">{closure.name}</div>
      <div class="text-xs text-amber-800">
        National · {closure.startDate} → {closure.endDate}
        {#if closure.category} · {closure.category}{/if}
      </div>
    </div>
  {:else}
    <p class="text-sm text-slate-500">No published national closures for this session.</p>
  {/each}

  <div class="flex items-center justify-between pt-2">
    <h2 class="text-sm font-medium text-slate-700">Local / manual closures</h2>
    <button type="button" class="text-sm font-medium text-emerald-700" onclick={addLocalClosure}>
      + Add local
    </button>
  </div>
  {#each closures as closure, index (closure.id ?? index)}
    <div class="space-y-2 rounded-lg border border-slate-200 px-3 py-3 text-sm">
      <input
        type="text"
        bind:value={closure.name}
        placeholder="Name"
        class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
      <NepaliDatePicker
        label="Start"
        value={closure.startDate}
        onChange={(v) => (closure.startDate = v)}
      />
      <NepaliDatePicker
        label="End"
        value={closure.endDate}
        onChange={(v) => (closure.endDate = v)}
      />
      <button type="button" class="text-xs text-rose-700" onclick={() => removeLocalClosure(index)}>
        Remove
      </button>
    </div>
  {/each}

  <button
    type="button"
    disabled={loading}
    onclick={onContinue}
    class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
  >
    {loading ? 'Saving…' : 'Continue to approve'}
  </button>
</div>
