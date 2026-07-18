import { describe, expect, it } from 'vitest';
import { allowedSweepRatings, buildSweepConfirmPayload } from './sweep-logic';

describe('sweep-logic', () => {
  it('builds confirm payload without secure rating', () => {
    const payload = buildSweepConfirmPayload([
      {
        childId: 'c1',
        childName: 'Aarav',
        outcomeId: 'o1',
        ratingCode: 'emerging',
      },
    ]);
    expect(payload[0]?.ratingCode).toBe('emerging');
    expect(allowedSweepRatings()).not.toContain('secure' as never);
  });
});
