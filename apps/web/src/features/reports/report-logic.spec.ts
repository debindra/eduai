import { describe, expect, it } from 'vitest';
import { currentMonthPeriod, reportUiBranch } from './report-logic';

describe('report-logic', () => {
  it('branches thin data to fallback', () => {
    expect(reportUiBranch(true)).toBe('fallback');
    expect(reportUiBranch(false)).toBe('draft');
  });

  it('currentMonthPeriod returns calendar-month bounds', () => {
    const period = currentMonthPeriod(new Date('2026-07-19T12:00:00'));
    expect(period.periodStart).toBe('2026-07-01');
    expect(period.periodEnd).toBe('2026-07-31');
  });
});
