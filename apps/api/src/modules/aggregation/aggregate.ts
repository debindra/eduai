/**
 * Pure aggregation: Σ(numeric_value) ÷ (4 × n) × 100 → letter grade.
 * Zero AI. Cut-offs come from grade_scales (kind=letter) — never hardcoded.
 */

export interface RatingInput {
  ratingCode: string;
  numericValue: number;
  state: string;
}

export interface LetterCutoff {
  code: string;
  minPercent: number;
  maxPercent: number;
  sortOrder: number;
}

export interface AggregateResult {
  percent: number;
  letterCode: string;
  n: number;
  sum: number;
}

export function aggregateRatings(
  ratings: RatingInput[],
  letterCutoffs: LetterCutoff[],
): AggregateResult {
  if (ratings.length === 0) {
    throw new Error('Cannot aggregate empty rating set');
  }
  for (const r of ratings) {
    if (r.state !== 'confirmed') {
      throw new Error('Aggregation requires confirmed outcomes only');
    }
  }
  const n = ratings.length;
  const sum = ratings.reduce((acc, r) => acc + r.numericValue, 0);
  const percent = (sum / (4 * n)) * 100;
  const letterCode = percentToLetter(percent, letterCutoffs);
  return { percent, letterCode, n, sum };
}

export function percentToLetter(percent: number, cutoffs: LetterCutoff[]): string {
  if (cutoffs.length === 0) {
    throw new Error('No letter grade cut-offs configured for band');
  }
  const sorted = [...cutoffs].sort((a, b) => a.sortOrder - b.sortOrder);
  for (const c of sorted) {
    if (percent >= c.minPercent && percent <= c.maxPercent) {
      return c.code;
    }
  }
  // Boundary: 100.0 may sit just above max of last band if max is 100 exclusive elsewhere
  const last = sorted[sorted.length - 1];
  if (percent >= last.minPercent) return last.code;
  throw new Error(`Percent ${percent} outside configured letter cut-offs`);
}
