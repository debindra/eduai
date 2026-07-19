<script lang="ts">
  /** Test double: plain text input instead of NepaliCalendar popover. */
  type Props = {
    id?: string;
    label: string;
    value: string;
    required?: boolean;
    onChange: (adIso: string) => void;
  };

  let { id, label, value, required = false, onChange }: Props = $props();
</script>

<label class="block text-sm" for={id}>
  {label}
  <input
    {id}
    type="text"
    {required}
    value={value}
    class="mt-1 w-full rounded border px-2 py-1"
    oninput={(e) => onChange((e.currentTarget as HTMLInputElement).value)}
  />
</label>
