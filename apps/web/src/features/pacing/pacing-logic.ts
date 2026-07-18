export type PacingApiState = 'on_track' | 'behind' | 'self_correcting';

export function pacingBadgeLabel(state: PacingApiState): string {
  switch (state) {
    case 'on_track':
      return 'On track';
    case 'behind':
      return 'Behind';
    case 'self_correcting':
      return 'Self-correcting';
  }
}

/** Coverage badge must never accept outcome ratings. */
export function assertNoOutcomeMerge(payload: Record<string, unknown>): boolean {
  return !('outcomeRatings' in payload) && !('studentOutcomes' in payload);
}
