/**
 * Pure Annex / area achievement helpers (I6–I8). Zero AI.
 * Mirrors apps/api aggregation computeAreaAchievement — keep in sync.
 */

export type AnnexIndicatorRating = {
  indicatorCode: string;
  rating: number;
  state: string;
};

export type AnnexAreaAchievement =
  | {
      status: 'computed';
      percent: number;
      n: number;
      sum: number;
      denominator: number;
      formulaFooter: string;
    }
  | {
      status: 'withheld';
      missingIndicators: string[];
      nRated: number;
      indicatorCount: number;
      formulaFooter: string;
    };

/**
 * I6: denominator is 4 × annex indicator_count.
 * I8: incomplete → withheld (never a partial %).
 */
export function annexAreaAchievement(
  indicatorCount: number,
  allIndicatorCodes: string[],
  ratings: AnnexIndicatorRating[],
): AnnexAreaAchievement {
  if (indicatorCount <= 0) {
    throw new Error('I6: indicator_count must be > 0');
  }
  if (allIndicatorCodes.length !== indicatorCount) {
    throw new Error('I6: indicator codes must match annex indicator_count');
  }

  const byCode = new Map<string, AnnexIndicatorRating>();
  for (const r of ratings) {
    if (r.state === 'confirmed') {
      byCode.set(r.indicatorCode, r);
    }
  }

  const missingIndicators = allIndicatorCodes.filter((c) => !byCode.has(c));
  if (missingIndicators.length > 0) {
    return {
      status: 'withheld',
      missingIndicators,
      nRated: byCode.size,
      indicatorCount,
      formulaFooter: `Withheld — missing ${missingIndicators.join(', ')} (need all ${indicatorCount} indicators; denominator 4×${indicatorCount})`,
    };
  }

  const sum = allIndicatorCodes.reduce((acc, code) => acc + byCode.get(code)!.rating, 0);
  const denominator = 4 * indicatorCount;
  const percent = (sum / denominator) * 100;
  return {
    status: 'computed',
    percent,
    n: indicatorCount,
    sum,
    denominator,
    formulaFooter: `Σ=${sum} ÷ (4 × ${indicatorCount}) × 100 = ${percent.toFixed(2)}%`,
  };
}
