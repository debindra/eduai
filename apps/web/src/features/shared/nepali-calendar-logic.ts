/**
 * Pure helpers for NepaliCalendar (hamropatro-style).
 * Presentation only — callers overlay closures.
 */

import * as BsDate from '@eduai/bs-date';

export type CalendarViewMode = 'year' | 'month';

export type CalendarDayCell = {
  bsYear: number;
  bsMonth: number;
  bsDay: number;
  adIso: string;
  /** ISO weekday 1=Mon … 7=Sun */
  weekdayIso: number;
  /** Column index in a Mon-first grid (0–6). */
  col: number;
  isOutsideMonth: boolean;
};

export function adToBs(isoDate: string) {
  return BsDate.adToBs(isoDate);
}

export function bsToAd(bsYear: number, bsMonth: number, bsDay: number) {
  return BsDate.bsToAd(bsYear, bsMonth, bsDay);
}

export function bsMonthLength(bsYear: number, bsMonth: number) {
  return BsDate.bsMonthLength(bsYear, bsMonth);
}

export function bsMonthName(bsMonth: number) {
  return BsDate.bsMonthName(bsMonth);
}

export function bsDayOfWeekIso(bsYear: number, bsMonth: number, bsDay: number) {
  return BsDate.bsDayOfWeekIso(bsYear, bsMonth, bsDay);
}

export function toDevanagariNumerals(value: number | string) {
  return BsDate.toDevanagariNumerals(value);
}

export function clampMonth(month: number): number {
  if (month < 1) return 1;
  if (month > 12) return 12;
  return month;
}

/** Prev/next month within the same BS year only — no year change. */
export function shiftMonthInYear(
  bsYear: number,
  bsMonth: number,
  delta: number,
): { bsYear: number; bsMonth: number; changed: boolean } {
  const next = bsMonth + delta;
  if (next < 1 || next > 12) {
    return { bsYear, bsMonth, changed: false };
  }
  return { bsYear, bsMonth: next, changed: true };
}

export function buildMonthGrid(bsYear: number, bsMonth: number): CalendarDayCell[] {
  const length = bsMonthLength(bsYear, bsMonth);
  const firstWeekday = bsDayOfWeekIso(bsYear, bsMonth, 1); // 1=Mon
  const cells: CalendarDayCell[] = [];
  // Leading empty cells for Mon-first grid
  for (let i = 1; i < firstWeekday; i += 1) {
    cells.push({
      bsYear,
      bsMonth,
      bsDay: 0,
      adIso: '',
      weekdayIso: i,
      col: i - 1,
      isOutsideMonth: true,
    });
  }
  for (let day = 1; day <= length; day += 1) {
    const weekdayIso = bsDayOfWeekIso(bsYear, bsMonth, day);
    cells.push({
      bsYear,
      bsMonth,
      bsDay: day,
      adIso: bsToAd(bsYear, bsMonth, day),
      weekdayIso,
      col: weekdayIso - 1,
      isOutsideMonth: false,
    });
  }
  return cells;
}

export function formatBsHeading(bsYear: number, bsMonth: number): string {
  return `${bsMonthName(bsMonth)} ${bsYear}`;
}

export function formatBsDayDevanagari(bsDay: number): string {
  return toDevanagariNumerals(bsDay);
}

export function formatAdSecondary(adIso: string): string {
  if (!adIso) return '';
  const [y, m, d] = adIso.split('-');
  return `${Number(d)}/${Number(m)}/${y}`;
}

/** AD day only in Western/Arabic digits — for month-grid secondary line. */
export function formatAdDayOnly(adIso: string): string {
  if (!adIso) return '';
  const day = adIso.split('-')[2];
  return day ? String(Number(day)) : '';
}

const AD_MONTH_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function parseAdParts(adIso: string): { year: number; month: number } | null {
  if (!adIso) return null;
  const [y, m] = adIso.split('-');
  const year = Number(y);
  const month = Number(m);
  if (!year || !month || month < 1 || month > 12) return null;
  return { year, month };
}

/**
 * AD month span covered by a BS month — e.g. "Apr–May 2025" or "Apr 2025".
 * Cross-year (rare): "Dec 2025–Jan 2026".
 */
export function formatAdMonthSpanForBsMonth(bsYear: number, bsMonth: number): string {
  const length = bsMonthLength(bsYear, bsMonth);
  const start = parseAdParts(bsToAd(bsYear, bsMonth, 1));
  const end = parseAdParts(bsToAd(bsYear, bsMonth, length));
  if (!start || !end) return '';
  const startLabel = AD_MONTH_SHORT[start.month - 1]!;
  const endLabel = AD_MONTH_SHORT[end.month - 1]!;
  if (start.year === end.year && start.month === end.month) {
    return `${startLabel} ${start.year}`;
  }
  if (start.year === end.year) {
    return `${startLabel}–${endLabel} ${start.year}`;
  }
  return `${startLabel} ${start.year}–${endLabel} ${end.year}`;
}

/** Humanized BS date for list/labels — e.g. "Jestha 15, 2082". */
export function formatBsPrimary(adIso: string): string {
  if (!adIso) return '';
  const { bsYear, bsMonth, bsDay } = adToBs(adIso);
  return `${bsMonthName(bsMonth)} ${bsDay}, ${bsYear}`;
}

/**
 * Humanized BS range for closures — primary display.
 * Same day: "Jestha 15, 2082"
 * Same month: "Jestha 15–18, 2082"
 * Same year: "Jestha 15 – Ashadh 2, 2082"
 */
export function formatBsDateRangePrimary(startAdIso: string, endAdIso: string): string {
  if (!startAdIso) return '';
  if (!endAdIso || endAdIso === startAdIso) return formatBsPrimary(startAdIso);
  const start = adToBs(startAdIso);
  const end = adToBs(endAdIso);
  if (start.bsYear === end.bsYear && start.bsMonth === end.bsMonth) {
    return `${bsMonthName(start.bsMonth)} ${start.bsDay}–${end.bsDay}, ${start.bsYear}`;
  }
  if (start.bsYear === end.bsYear) {
    return `${bsMonthName(start.bsMonth)} ${start.bsDay} – ${bsMonthName(end.bsMonth)} ${end.bsDay}, ${start.bsYear}`;
  }
  return `${formatBsPrimary(startAdIso)} – ${formatBsPrimary(endAdIso)}`;
}

/** AD secondary for a range — e.g. "AD 29/5/2025" or "AD 1/10/2025 → 7/10/2025". */
export function formatAdDateRangeSecondary(startAdIso: string, endAdIso: string): string {
  if (!startAdIso) return '';
  const start = formatAdSecondary(startAdIso);
  if (!endAdIso || endAdIso === startAdIso) return `AD ${start}`;
  return `AD ${start} → ${formatAdSecondary(endAdIso)}`;
}

export function partsFromAdIso(adIso: string) {
  return adToBs(adIso);
}

export function todayBsParts() {
  const now = new Date();
  const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return adToBs(iso);
}

export const WEEKDAY_LABELS_SHORT = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
