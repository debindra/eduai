import { describe, expect, it } from 'vitest';
import { assertGravitySafe, formatReplyRate } from './admin-logic';

describe('assertGravitySafe', () => {
  it('accepts counts/shapes payload', () => {
    expect(
      assertGravitySafe({
        sectionsBehindCount: 1,
        coverageBySection: [{ sectionId: 's1', childrenWithFreshOutcomes: 3 }],
      }),
    ).toBe(true);
  });

  it('rejects child names and distributions', () => {
    expect(assertGravitySafe({ childNames: ['Priya'] })).toBe(false);
    expect(assertGravitySafe({ bandDistributions: {} })).toBe(false);
  });
});

describe('formatReplyRate', () => {
  it('formats null and numeric rates', () => {
    expect(formatReplyRate(null)).toMatch(/No messages/);
    expect(formatReplyRate(0.8)).toBe('80% replied within a day');
  });
});
