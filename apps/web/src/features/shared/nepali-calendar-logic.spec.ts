import { describe, expect, it } from 'vitest';
import {
  adToBs,
  buildMonthGrid,
  bsMonthLength,
  bsToAd,
  clampMonth,
  formatAdDateRangeSecondary,
  formatAdDayOnly,
  formatAdMonthSpanForBsMonth,
  formatBsDateRangePrimary,
  formatBsDayDevanagari,
  formatBsPrimary,
  isAdDateInInclusiveRange,
  normalizeDateRange,
  shiftMonthInYear,
} from './nepali-calendar-logic';

describe('nepali-calendar-logic', () => {
  it('clamps months to 1–12', () => {
    expect(clampMonth(0)).toBe(1);
    expect(clampMonth(13)).toBe(12);
    expect(clampMonth(5)).toBe(5);
  });

  it('prevents month navigation outside the current BS year', () => {
    expect(shiftMonthInYear(2082, 1, -1)).toEqual({
      bsYear: 2082,
      bsMonth: 1,
      changed: false,
    });
    expect(shiftMonthInYear(2082, 12, 1)).toEqual({
      bsYear: 2082,
      bsMonth: 12,
      changed: false,
    });
    expect(shiftMonthInYear(2082, 5, 1)).toEqual({
      bsYear: 2082,
      bsMonth: 6,
      changed: true,
    });
  });

  it('builds a month grid with in-month days only for real cells', () => {
    const grid = buildMonthGrid(2082, 1);
    const inMonth = grid.filter((c) => !c.isOutsideMonth);
    expect(inMonth.length).toBeGreaterThanOrEqual(29);
    expect(inMonth.length).toBeLessThanOrEqual(32);
    expect(inMonth.every((c) => c.adIso.length === 10)).toBe(true);
  });

  it('renders Devanagari day numerals', () => {
    expect(formatBsDayDevanagari(14)).toBe('१४');
  });

  it('formats a single AD date as humanized BS primary', () => {
    const parts = adToBs('2025-04-14');
    expect(formatBsPrimary('2025-04-14')).toBe(
      `Baisakh ${parts.bsDay}, ${parts.bsYear}`,
    );
  });

  it('formats same-day and multi-day BS ranges with AD secondary', () => {
    const singleBs = formatBsDateRangePrimary('2025-05-29', '2025-05-29');
    expect(singleBs).toMatch(/^\w+ \d+, \d{4}$/);
    expect(formatAdDateRangeSecondary('2025-05-29', '2025-05-29')).toBe('AD 29/5/2025');

    const rangeBs = formatBsDateRangePrimary('2025-10-01', '2025-10-07');
    expect(rangeBs).toMatch(/–/);
    expect(formatAdDateRangeSecondary('2025-10-01', '2025-10-07')).toBe(
      'AD 1/10/2025 → 7/10/2025',
    );
  });

  it('normalizes and detects inclusive AD ranges', () => {
    expect(normalizeDateRange('2025-10-07', '2025-10-01')).toEqual({
      startDate: '2025-10-01',
      endDate: '2025-10-07',
    });
    expect(isAdDateInInclusiveRange('2025-10-03', '2025-10-01', '2025-10-07')).toBe(true);
    expect(isAdDateInInclusiveRange('2025-10-08', '2025-10-01', '2025-10-07')).toBe(false);
  });

  it('formats AD day only in Western digits', () => {
    expect(formatAdDayOnly('2025-04-14')).toBe('14');
    expect(formatAdDayOnly('2025-10-01')).toBe('1');
    expect(formatAdDayOnly('')).toBe('');
  });

  it('formats AD month span for a BS month', () => {
    const start = bsToAd(2082, 1, 1);
    const end = bsToAd(2082, 1, bsMonthLength(2082, 1));
    const startMonth = Number(start.split('-')[1]);
    const endMonth = Number(end.split('-')[1]);
    const span = formatAdMonthSpanForBsMonth(2082, 1);
    expect(span).toMatch(/2025/);
    if (startMonth === endMonth) {
      expect(span).toBe('Apr 2025');
    } else {
      expect(span).toBe('Apr–May 2025');
    }
  });
});
