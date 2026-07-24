import { describe, expect, it } from 'vitest';
import {
  allowedIndicatorSweepRatings,
  buildIndicatorSweepPayload,
  groupIndicatorsByLabel,
} from './indicator-sweep-logic';

describe('indicator-sweep-logic', () => {
  it('builds propose payload without rating 4', () => {
    const payload = buildIndicatorSweepPayload([
      {
        childId: 'c1',
        childName: 'Aarav',
        indicatorId: 'ind1',
        rating: 2,
        groupLabel: 'L',
      },
    ]);
    expect(payload[0]?.rating).toBe(2);
    expect(allowedIndicatorSweepRatings()).not.toContain(4 as never);
  });

  it('groups indicators by group_label (skill shape)', () => {
    const map = groupIndicatorsByLabel([
      { code: 'a', group_label: 'L' },
      { code: 'b', group_label: 'S' },
      { code: 'c', group_label: 'L' },
    ]);
    expect(map.get('L')?.map((i) => i.code)).toEqual(['a', 'c']);
    expect(map.get('S')?.map((i) => i.code)).toEqual(['b']);
  });
});
