<script lang="ts">
  import type { SchoolEcaCcaItem } from '../../eca-cca/eca-cca-logic';
  import type { LocalClosure, NationalClosure } from '../calendar-wizard-logic';
  import CalendarBoard from './CalendarBoard.svelte';

  type Props = {
    bsYear: number | null;
    nationalClosures: NationalClosure[];
    closures: LocalClosure[];
    sessionStart: string;
    sessionEnd: string;
    weeklyOffs: number[];
    loading: boolean;
    schoolActivities?: SchoolEcaCcaItem[];
    /** Approved calendars: board is view-only and continue is hidden. */
    readOnly?: boolean;
    /** Optional draft-only save (platform configure flow). */
    saveDraftLabel?: string;
    onSaveDraft?: () => void;
    continueLabel?: string;
    onContinue: () => void;
    /** Navigate back to setup (draft re-edit). */
    onBackToSetup?: () => void;
  };

  let {
    bsYear,
    nationalClosures,
    closures = $bindable(),
    sessionStart,
    sessionEnd,
    weeklyOffs,
    loading,
    schoolActivities = [],
    readOnly = false,
    saveDraftLabel = 'Save changes (Draft)',
    onSaveDraft,
    continueLabel = 'Continue to approve',
    onContinue,
    onBackToSetup,
  }: Props = $props();
</script>

<div class="mt-6 space-y-6">
  {#if bsYear}
    <CalendarBoard
      {bsYear}
      title="School calendar"
      {nationalClosures}
      bind:closures
      {sessionStart}
      {sessionEnd}
      {weeklyOffs}
      {schoolActivities}
      editable={!readOnly}
      readOnly={readOnly}
      initialView="month"
    />
  {:else}
    <p class="text-sm text-slate-500">Loading calendar…</p>
  {/if}

  {#if !readOnly}
    <div class="flex flex-wrap gap-2">
      {#if onBackToSetup}
        <button
          type="button"
          disabled={loading}
          onclick={onBackToSetup}
          data-testid="closures-back-setup"
          class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
        >
          Back to setup
        </button>
      {/if}
      {#if onSaveDraft}
        <button
          type="button"
          disabled={loading}
          onclick={onSaveDraft}
          data-testid="closures-save-draft"
          class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
        >
          {loading ? 'Saving…' : saveDraftLabel}
        </button>
      {/if}
      <button
        type="button"
        disabled={loading}
        onclick={onContinue}
        data-testid="closures-continue"
        class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {loading ? 'Saving…' : continueLabel}
      </button>
    </div>
  {/if}
</div>
