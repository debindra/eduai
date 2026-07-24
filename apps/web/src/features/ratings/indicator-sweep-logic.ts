/**
 * G4–5 indicator sweep helpers (Guideline 2083).
 * Batch sweep never offers top rating 4 (mapper guard).
 */

export type IndicatorSweepRow = {
  childId: string;
  childName: string;
  indicatorId: string;
  rating: 1 | 2 | 3;
  groupLabel?: string | null;
};

export function buildIndicatorSweepPayload(rows: IndicatorSweepRow[]) {
  return rows.map((r) => ({
    childId: r.childId,
    indicatorId: r.indicatorId,
    rating: r.rating,
    captureMode: 'batch_sweep' as const,
  }));
}

/** Top rating 4 is never offered in batch sweep UI. */
export function allowedIndicatorSweepRatings(): Array<1 | 2 | 3> {
  return [1, 2, 3];
}

/** Group indicators by nullable group_label for skill/content shapes. */
export function groupIndicatorsByLabel<T extends { group_label?: string | null; groupLabel?: string | null }>(
  indicators: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const ind of indicators) {
    const label = ind.group_label ?? ind.groupLabel ?? '';
    const list = map.get(label) ?? [];
    list.push(ind);
    map.set(label, list);
  }
  return map;
}
