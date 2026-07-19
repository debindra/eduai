import { describe, expect, it } from 'vitest';
import {
  adToBs,
  bsDayOfWeekIso,
  bsMonthLength,
  bsMonthName,
  bsToAd,
  bsYearForAdDate,
  toDevanagariNumerals,
} from './index';

describe('@eduai/bs-date', () => {
  it('converts a known AD date to BS (Nepali new year vicinity)', () => {
    // 14 April 2025 ≈ Baisakh 1, 2082 (BS new year)
    const bs = adToBs('2025-04-14');
    expect(bs.bsYear).toBe(2082);
    expect(bs.bsMonth).toBe(1);
    expect(bs.bsDay).toBeGreaterThanOrEqual(1);
    expect(bs.bsDay).toBeLessThanOrEqual(3);
  });

  it('round-trips AD → BS → AD across year boundaries', () => {
    const samples = [
      '2025-01-01', // AD new year
      '2025-04-14', // near BS new year
      '2025-12-31',
      '2026-01-01',
      '2026-04-13',
    ];
    for (const iso of samples) {
      const bs = adToBs(iso);
      const back = bsToAd(bs.bsYear, bs.bsMonth, bs.bsDay);
      expect(back).toBe(iso);
    }
  });

  it('reports BS month lengths in the 29–32 range', () => {
    for (let month = 1; month <= 12; month += 1) {
      const length = bsMonthLength(2082, month);
      expect(length).toBeGreaterThanOrEqual(29);
      expect(length).toBeLessThanOrEqual(32);
    }
  });

  it('returns bsYearForAdDate matching adToBs', () => {
    expect(bsYearForAdDate('2025-10-02')).toBe(adToBs('2025-10-02').bsYear);
  });

  it('names BS months in English transliteration', () => {
    expect(bsMonthName(1)).toBe('Baisakh');
    expect(bsMonthName(12)).toBe('Chaitra');
  });

  it('returns ISO weekday for a BS date', () => {
    const dow = bsDayOfWeekIso(2082, 1, 1);
    expect(dow).toBeGreaterThanOrEqual(1);
    expect(dow).toBeLessThanOrEqual(7);
  });

  it('renders Devanagari numerals', () => {
    expect(toDevanagariNumerals(2082)).toBe('२०८२');
    expect(toDevanagariNumerals('14')).toBe('१४');
  });
});
