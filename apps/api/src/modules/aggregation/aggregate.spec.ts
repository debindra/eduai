import { describe, expect, it } from 'vitest';
import { aggregateRatings, percentToLetter, type LetterCutoff } from './aggregate';

const CUTOFFS: LetterCutoff[] = [
  { code: 'E', minPercent: 0, maxPercent: 19.99, sortOrder: 1 },
  { code: 'D', minPercent: 20, maxPercent: 39.99, sortOrder: 2 },
  { code: 'C', minPercent: 40, maxPercent: 59.99, sortOrder: 3 },
  { code: 'B', minPercent: 60, maxPercent: 74.99, sortOrder: 4 },
  { code: 'A', minPercent: 75, maxPercent: 89.99, sortOrder: 5 },
  { code: 'A+', minPercent: 90, maxPercent: 100, sortOrder: 6 },
];

describe('aggregateRatings', () => {
  it('computes Σ ÷ (4 × n) × 100 → letter from config cut-offs', () => {
    const result = aggregateRatings(
      [
        { ratingCode: '3', numericValue: 3, state: 'confirmed' },
        { ratingCode: '3', numericValue: 3, state: 'confirmed' },
        { ratingCode: '4', numericValue: 4, state: 'confirmed' },
        { ratingCode: '2', numericValue: 2, state: 'confirmed' },
      ],
      CUTOFFS,
    );
    // sum=12, n=4 → 12/(16)*100 = 75 → A
    expect(result.percent).toBe(75);
    expect(result.letterCode).toBe('A');
    expect(result.n).toBe(4);
    expect(result.sum).toBe(12);
  });

  it('rejects proposed (unconfirmed) outcomes', () => {
    expect(() =>
      aggregateRatings(
        [{ ratingCode: '3', numericValue: 3, state: 'proposed' }],
        CUTOFFS,
      ),
    ).toThrow(/confirmed/);
  });

  it('rejects empty set', () => {
    expect(() => aggregateRatings([], CUTOFFS)).toThrow(/empty/);
  });

  it('maps A+ at 100%', () => {
    const result = aggregateRatings(
      [
        { ratingCode: '4', numericValue: 4, state: 'confirmed' },
        { ratingCode: '4', numericValue: 4, state: 'confirmed' },
      ],
      CUTOFFS,
    );
    expect(result.percent).toBe(100);
    expect(result.letterCode).toBe('A+');
  });
});

describe('percentToLetter', () => {
  it('reads cut-offs from config — no hardcoded thresholds', () => {
    expect(percentToLetter(0, CUTOFFS)).toBe('E');
    expect(percentToLetter(45, CUTOFFS)).toBe('C');
    expect(percentToLetter(60, CUTOFFS)).toBe('B');
    expect(percentToLetter(89.99, CUTOFFS)).toBe('A');
  });
});
