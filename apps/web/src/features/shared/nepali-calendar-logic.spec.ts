import { describe, expect, it } from 'vitest';
import {
  buildMonthGrid,
  clampMonth,
  formatBsDayDevanagari,
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
});
