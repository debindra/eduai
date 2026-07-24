import { describe, expect, it } from 'vitest';
import { allowedSweepRatings, buildSweepConfirmPayload } from './sweep-logic';

describe('sweep-logic', () => {
  it('builds confirm payload without can_do rating', () => {
    const payload = buildSweepConfirmPayload([
      {
        childId: 'c1',
        childName: 'Aarav',
        outcomeId: 'o1',
        ratingCode: 'not_yet',
      },
    ]);
    expect(payload[0]?.ratingCode).toBe('not_yet');
    expect(allowedSweepRatings()).not.toContain('can_do' as never);
  });
});
