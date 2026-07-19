<script lang="ts">
  import CalendarBoard from './components/CalendarBoard.svelte';
  import type { CalendarViewResponse } from './api';
  import { boardPropsFromView } from './school-calendar-view-logic';

  type Props = {
    view: CalendarViewResponse;
    title?: string;
    readOnly?: boolean;
  };

  let {
    view,
    title = 'School calendar',
    readOnly = true,
  }: Props = $props();

  const board = $derived(boardPropsFromView(view));
</script>

{#if board}
  <CalendarBoard
    bsYear={board.bsYear}
    {title}
    {readOnly}
    nationalClosures={board.nationalClosures}
    localClosures={board.localClosures}
    sessionStart={board.sessionStart}
    sessionEnd={board.sessionEnd}
    weeklyOffs={board.weeklyOffs}
  />
{/if}
