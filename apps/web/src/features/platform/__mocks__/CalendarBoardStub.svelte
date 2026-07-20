<!-- Minimal stub so NationalCalendarPage tests do not mount NepaliCalendar. -->
<script lang="ts">
  type Props = Record<string, unknown>;
  let {
    title = 'Calendar board stub',
  }: Props = $props();
</script>

<div data-testid="calendar-board-stub">{title}</div>
