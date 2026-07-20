<script lang="ts">
  import TeachingDays from '../TeachingDays.svelte';
  import type { LocalClosure, NationalClosure } from '../calendar-wizard-logic';
  import type { CalendarViewResponse } from '../api';
  import CalendarBoard from './CalendarBoard.svelte';
  import SchoolCalendarBoard from '../SchoolCalendarBoard.svelte';
  import { isConfiguredCalendarView } from '../school-calendar-view-logic';

  type TeachingDaysPayload = {
    schoolId: string;
    terminals: Array<{
      terminalId: string;
      terminalName: string;
      teachingDayCount: number;
    }>;
  };

  type Props = {
    approvedYearLabel: string | null;
    loading: boolean;
    onApprove: () => void;
    onEdit?: () => void;
    /** Navigate back to closures before approve (draft flow). */
    onBack?: () => void;
    /** True when a draft is being published over a live approved calendar. */
    hasLiveApproved?: boolean;
    /** Prefer this when present — same board as teacher / platform support. */
    configuredView?: CalendarViewResponse | null;
    bsYear?: number | null;
    nationalClosures?: NationalClosure[];
    closures?: LocalClosure[];
    sessionStart?: string;
    sessionEnd?: string;
    weeklyOffs?: number[];
    loadTeachingDays?: () => Promise<TeachingDaysPayload>;
  };

  let {
    approvedYearLabel,
    loading,
    onApprove,
    onEdit,
    onBack,
    hasLiveApproved = false,
    configuredView = null,
    bsYear = null,
    nationalClosures = [],
    closures = [],
    sessionStart = '',
    sessionEnd = '',
    weeklyOffs = [],
    loadTeachingDays,
  }: Props = $props();

  const useSharedBoard = $derived(isConfiguredCalendarView(configuredView));
  const isApproved = $derived(approvedYearLabel !== null);
</script>

<div class="mt-6 space-y-4">
  {#if !isApproved && hasLiveApproved}
    <p class="text-sm text-amber-900">Approve this draft to replace the live calendar.</p>
  {/if}

  {#if useSharedBoard && configuredView}
    <SchoolCalendarBoard view={configuredView} title="" readOnly={true} />
  {:else if bsYear}
    <CalendarBoard
      {bsYear}
      title=""
      nationalClosures={nationalClosures}
      localClosures={closures}
      {sessionStart}
      {sessionEnd}
      {weeklyOffs}
    />
  {/if}

  <div class="flex flex-wrap gap-2">
    {#if isApproved && onEdit}
      <button
        type="button"
        disabled={loading}
        onclick={onEdit}
        class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
        data-testid="calendar-wizard-edit"
      >
        {loading ? 'Opening draft…' : 'Edit calendar'}
      </button>
    {:else if !isApproved}
      {#if onBack}
        <button
          type="button"
          disabled={loading}
          onclick={onBack}
          class="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
          data-testid="approve-back"
        >
          Back to closures
        </button>
      {/if}
      <button
        type="button"
        disabled={loading}
        onclick={onApprove}
        class="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
        data-testid="calendar-wizard-approve"
      >
        {loading ? 'Approving…' : 'Approve calendar'}
      </button>
    {/if}
  </div>
  <TeachingDays {loadTeachingDays} />
</div>
