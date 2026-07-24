import { describe, expect, it } from 'vitest';
import {
  aggregateRatings,
  aggregateSubjectFromAreas,
  computeAreaAchievement,
  percentToLetter,
  rollupAreasToDomains,
  type LetterCutoff,
} from './aggregate';

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

const BASIC_UPPER_CUTOFFS: LetterCutoff[] = [
  { code: 'NG', minPercent: 0, maxPercent: 19.99, sortOrder: 1 },
  { code: 'E', minPercent: 20, maxPercent: 34.99, sortOrder: 2 },
  { code: 'D', minPercent: 35, maxPercent: 49.99, sortOrder: 3 },
  { code: 'C', minPercent: 50, maxPercent: 64.99, sortOrder: 4 },
  { code: 'B', minPercent: 65, maxPercent: 74.99, sortOrder: 5 },
  { code: 'A', minPercent: 75, maxPercent: 89.99, sortOrder: 6 },
  { code: 'A+', minPercent: 90, maxPercent: 100, sortOrder: 7 },
];

describe('aggregateRatings against basic_upper NG–A+ fixtures (P4-TEST-01)', () => {
  it('maps the same Σ ÷ (4 × n) × 100 formula onto NG–A+ cut-offs with zero logic change', () => {
    const result = aggregateRatings(
      [
        { ratingCode: '3', numericValue: 3, state: 'confirmed' },
        { ratingCode: '3', numericValue: 3, state: 'confirmed' },
        { ratingCode: '4', numericValue: 4, state: 'confirmed' },
        { ratingCode: '2', numericValue: 2, state: 'confirmed' },
      ],
      BASIC_UPPER_CUTOFFS,
    );
    expect(result.percent).toBe(75);
    expect(result.letterCode).toBe('A');
  });

  it('maps low percent to NG (not E)', () => {
    const result = aggregateRatings(
      [
        { ratingCode: '1', numericValue: 1, state: 'confirmed' },
        { ratingCode: '1', numericValue: 1, state: 'confirmed' },
      ],
      BASIC_UPPER_CUTOFFS,
    );
    expect(result.percent).toBe(25);
    expect(result.letterCode).toBe('E');
    expect(percentToLetter(0, BASIC_UPPER_CUTOFFS)).toBe('NG');
    expect(percentToLetter(10, BASIC_UPPER_CUTOFFS)).toBe('NG');
  });

  it('maps A+ at 100% on basic_upper cut-offs', () => {
    const result = aggregateRatings(
      [
        { ratingCode: '4', numericValue: 4, state: 'confirmed' },
        { ratingCode: '4', numericValue: 4, state: 'confirmed' },
      ],
      BASIC_UPPER_CUTOFFS,
    );
    expect(result.percent).toBe(100);
    expect(result.letterCode).toBe('A+');
  });
});

describe('computeAreaAchievement (I6–I8)', () => {
  const codes = ['ENG4.U1.1', 'ENG4.U1.2', 'ENG4.U1.3', 'ENG4.U1.4'];

  it('I8: returns withheld with named missing indicators when incomplete', () => {
    const result = computeAreaAchievement(4, codes, [
      { indicatorCode: 'ENG4.U1.1', rating: 3, state: 'confirmed' },
      { indicatorCode: 'ENG4.U1.2', rating: 2, state: 'confirmed' },
    ]);
    expect(result.status).toBe('withheld');
    if (result.status === 'withheld') {
      expect(result.missingIndicators).toEqual(['ENG4.U1.3', 'ENG4.U1.4']);
      expect(result.nRated).toBe(2);
      expect(result.indicatorCount).toBe(4);
    }
  });

  it('I6: uses annex N as denominator 4×N, not ratings.length alone', () => {
    const result = computeAreaAchievement(4, codes, [
      { indicatorCode: 'ENG4.U1.1', rating: 4, state: 'confirmed' },
      { indicatorCode: 'ENG4.U1.2', rating: 4, state: 'confirmed' },
      { indicatorCode: 'ENG4.U1.3', rating: 4, state: 'confirmed' },
      { indicatorCode: 'ENG4.U1.4', rating: 4, state: 'confirmed' },
    ]);
    expect(result.status).toBe('computed');
    if (result.status === 'computed') {
      expect(result.denominator).toBe(16);
      expect(result.percent).toBe(100);
      expect(result.n).toBe(4);
    }
  });

  it('ignores proposed ratings for completeness', () => {
    const result = computeAreaAchievement(4, codes, [
      { indicatorCode: 'ENG4.U1.1', rating: 3, state: 'confirmed' },
      { indicatorCode: 'ENG4.U1.2', rating: 3, state: 'confirmed' },
      { indicatorCode: 'ENG4.U1.3', rating: 3, state: 'confirmed' },
      { indicatorCode: 'ENG4.U1.4', rating: 3, state: 'proposed' },
    ]);
    expect(result.status).toBe('withheld');
    if (result.status === 'withheld') {
      expect(result.missingIndicators).toEqual(['ENG4.U1.4']);
    }
  });
});

describe('aggregateSubjectFromAreas', () => {
  it('withholds subject when any area is incomplete', () => {
    const result = aggregateSubjectFromAreas(
      [
        {
          status: 'computed',
          percent: 75,
          n: 4,
          sum: 12,
          denominator: 16,
        },
        {
          status: 'withheld',
          missingIndicators: ['X.1'],
          nRated: 1,
          indicatorCount: 2,
        },
      ],
      CUTOFFS,
    );
    expect(result.status).toBe('withheld');
    if (result.status === 'withheld') {
      expect(result.missingIndicators).toContain('X.1');
    }
  });

  it('averages completed area percents into letter', () => {
    const result = aggregateSubjectFromAreas(
      [
        {
          status: 'computed',
          percent: 100,
          n: 2,
          sum: 8,
          denominator: 8,
        },
        {
          status: 'computed',
          percent: 50,
          n: 2,
          sum: 4,
          denominator: 8,
        },
      ],
      CUTOFFS,
    );
    expect(result.status).toBe('computed');
    if (result.status === 'computed') {
      expect(result.percent).toBe(75);
      expect(result.letterCode).toBe('A');
    }
  });
});

describe('rollupAreasToDomains', () => {
  it('maps area codes to domains via crosswalk rows only', () => {
    const map = rollupAreasToDomains(
      ['physical', 'language'],
      [
        { areaCode: 'physical', domainCode: 'D1' },
        { areaCode: 'language', domainCode: 'D2' },
      ],
    );
    expect(map.get('D1')).toEqual(['physical']);
    expect(map.get('D2')).toEqual(['language']);
    expect(map.has('D3')).toBe(false);
  });
});
