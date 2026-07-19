export function reportUiBranch(thinData: boolean): 'fallback' | 'draft' {
  return thinData ? 'fallback' : 'draft';
}

/** Calendar-month bounds for the given local date. */
export function currentMonthPeriod(now = new Date()): {
  periodStart: string;
  periodEnd: string;
} {
  const year = now.getFullYear();
  const month = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, '0');
  const lastDay = new Date(year, month + 1, 0).getDate();
  return {
    periodStart: `${year}-${pad(month + 1)}-01`,
    periodEnd: `${year}-${pad(month + 1)}-${pad(lastDay)}`,
  };
}
