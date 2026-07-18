export type SweepRow = {
  childId: string;
  childName: string;
  outcomeId: string;
  ratingCode: 'emerging' | 'developing';
};

export function buildSweepConfirmPayload(rows: SweepRow[]) {
  return rows.map((r) => ({
    childId: r.childId,
    outcomeId: r.outcomeId,
    ratingCode: r.ratingCode,
  }));
}

/** Secure is never offered in batch sweep UI — mapper guard. */
export function allowedSweepRatings(): Array<'emerging' | 'developing'> {
  return ['emerging', 'developing'];
}
