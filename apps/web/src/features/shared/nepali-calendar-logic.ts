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

export function partsFromAdIso(adIso: string) {
  return adToBs(adIso);
}

export function todayBsParts() {
  const now = new Date();
  const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return adToBs(iso);
}

export const WEEKDAY_LABELS_SHORT = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;
