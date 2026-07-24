/**
 * Pure aggregation helpers (zero AI).
 *
 * Legacy flat subject mean: Σ ÷ (4 × n) × 100 → letter (pre–v3.3 path).
 * v3.3 area achievement (I6–I8): annex N denominator; incomplete → withheld.
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

/** Confirmed indicator rating for area achievement. */
export interface IndicatorRatingInput {
  indicatorCode: string;
  rating: number;
  state: string;
}

export type AreaAchievementResult =
  | {
      status: 'computed';
      percent: number;
      n: number;
      sum: number;
      denominator: number;
    }
  | {
      status: 'withheld';
      missingIndicators: string[];
      nRated: number;
      indicatorCount: number;
    };

/**
 * Flat subject aggregation (legacy / when all inputs are already area-complete).
 * Requires confirmed rows only.
 */
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

/**
 * I6 + I8: area achievement from annex indicator_count.
 * Incomplete area → withheld with named missing indicator codes.
 * Never returns a partial percentage.
 */
export function computeAreaAchievement(
  indicatorCount: number,
  allIndicatorCodes: string[],
  ratings: IndicatorRatingInput[],
): AreaAchievementResult {
  if (indicatorCount <= 0) {
    throw new Error('I6: indicator_count must be > 0 (annex N)');
  }
  if (allIndicatorCodes.length !== indicatorCount) {
    throw new Error(
      `I6: allIndicatorCodes length (${allIndicatorCodes.length}) must equal indicator_count (${indicatorCount})`,
    );
  }

  const confirmed = ratings.filter((r) => r.state === 'confirmed');
  const byCode = new Map<string, IndicatorRatingInput>();
  for (const r of confirmed) {
    // Latest wins if multiple append-only rows passed in (caller should pre-select)
    byCode.set(r.indicatorCode, r);
  }

  const missingIndicators = allIndicatorCodes.filter((code) => !byCode.has(code));
  if (missingIndicators.length > 0) {
    return {
      status: 'withheld',
      missingIndicators,
      nRated: byCode.size,
      indicatorCount,
    };
  }

  const sum = allIndicatorCodes.reduce((acc, code) => {
    const row = byCode.get(code)!;
    return acc + row.rating;
  }, 0);
  const denominator = 4 * indicatorCount;
  const percent = (sum / denominator) * 100;
  return {
    status: 'computed',
    percent,
    n: indicatorCount,
    sum,
    denominator,
  };
}

/**
 * Subject overall from completed area percents only.
 * If any area is withheld, subject result is withheld (I8 surfaces).
 */
export function aggregateSubjectFromAreas(
  areaResults: AreaAchievementResult[],
  letterCutoffs: LetterCutoff[],
):
  | (AggregateResult & { status: 'computed' })
  | {
      status: 'withheld';
      withheldAreas: number;
      missingIndicators: string[];
    } {
  const missing: string[] = [];
  let withheldAreas = 0;
  const percents: number[] = [];

  for (const area of areaResults) {
    if (area.status === 'withheld') {
      withheldAreas += 1;
      missing.push(...area.missingIndicators);
    } else {
      percents.push(area.percent);
    }
  }

  if (withheldAreas > 0 || percents.length === 0) {
    return {
      status: 'withheld',
      withheldAreas,
      missingIndicators: [...new Set(missing)],
    };
  }

  const percent =
    percents.reduce((a, b) => a + b, 0) / percents.length;
  const letterCode = percentToLetter(percent, letterCutoffs);
  return {
    status: 'computed',
    percent,
    letterCode,
    n: percents.length,
    sum: percents.reduce((a, b) => a + b, 0),
  };
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
  const last = sorted[sorted.length - 1]!;
  if (percent >= last.minPercent) return last.code;
  throw new Error(`Percent ${percent} outside configured letter cut-offs`);
}

/** Pure 11→6 rollup: map area codes to domain codes via crosswalk rows. */
export function rollupAreasToDomains(
  areaCodes: string[],
  crosswalk: Array<{ areaCode: string; domainCode: string }>,
): Map<string, string[]> {
  const byDomain = new Map<string, string[]>();
  for (const areaCode of areaCodes) {
    const links = crosswalk.filter((c) => c.areaCode === areaCode);
    for (const link of links) {
      const list = byDomain.get(link.domainCode) ?? [];
      list.push(areaCode);
      byDomain.set(link.domainCode, list);
    }
  }
  return byDomain;
}
