<script lang="ts">
  /**
   * Test double: two text inputs for start/end instead of the range calendar.
   */
  type Props = {
    id?: string;
    label: string;
    startDate: string;
    endDate: string;
    required?: boolean;
    startAriaLabel?: string;
    endAriaLabel?: string;
    onChange: (range: { startDate: string; endDate: string }) => void;
  };

  let {
    id,
    label,
    startDate,
    endDate,
    required = false,
    startAriaLabel,
    endAriaLabel,
    onChange,
  }: Props = $props();

  const setStart = (value: string) => {
    onChange({ startDate: value, endDate });
  };

  const setEnd = (value: string) => {
    onChange({ startDate, endDate: value });
  };
</script>

<div class="space-y-2" data-testid="nepali-date-range-picker">
  <p class="text-sm font-medium text-slate-700">{label}</p>
  <label class="block text-sm" for={id ? `${id}-start` : undefined}>
    {startAriaLabel ?? `${label} start`}
    <input
      id={id ? `${id}-start` : undefined}
      type="text"
      {required}
      value={startDate}
      aria-label={startAriaLabel ?? `${label} start`}
      class="mt-1 w-full rounded border px-2 py-1"
      oninput={(e) => setStart((e.currentTarget as HTMLInputElement).value)}
    />
  </label>
  <label class="block text-sm" for={id ? `${id}-end` : undefined}>
    {endAriaLabel ?? `${label} end`}
    <input
      id={id ? `${id}-end` : undefined}
      type="text"
      {required}
      value={endDate}
      aria-label={endAriaLabel ?? `${label} end`}
      class="mt-1 w-full rounded border px-2 py-1"
      oninput={(e) => setEnd((e.currentTarget as HTMLInputElement).value)}
    />
  </label>
</div>
