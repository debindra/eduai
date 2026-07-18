import { describe, expect, it } from 'vitest';
import { assertNoOutcomeMerge, pacingBadgeLabel } from './pacing-logic';

describe('pacing-logic', () => {
  it('maps three states', () => {
    expect(pacingBadgeLabel('on_track')).toBe('On track');
    expect(pacingBadgeLabel('behind')).toBe('Behind');
    expect(pacingBadgeLabel('self_correcting')).toBe('Self-correcting');
  });

  it('rejects payloads that merge outcomes into coverage', () => {
    expect(assertNoOutcomeMerge({ state: 'on_track' })).toBe(true);
    expect(assertNoOutcomeMerge({ state: 'on_track', outcomeRatings: [] })).toBe(false);
  });
});
