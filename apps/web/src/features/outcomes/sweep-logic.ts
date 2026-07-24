export type SweepRow = {
  childId: string;
  childName: string;
  outcomeId: string;
  ratingCode: 'not_yet' | 'developing';
};

export function buildSweepConfirmPayload(rows: SweepRow[]) {
  return rows.map((r) => ({
    childId: r.childId,
    outcomeId: r.outcomeId,
    ratingCode: r.ratingCode,
  }));
}

/** can_do is never offered in batch sweep UI — mapper guard. */
export function allowedSweepRatings(): Array<'not_yet' | 'developing'> {
  return ['not_yet', 'developing'];
}
