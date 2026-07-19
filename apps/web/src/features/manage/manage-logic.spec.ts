import { describe, expect, it } from 'vitest';
import {
  adminFestivalHeadline,
  festivalHeadline,
  pickDefaultSettlingBandId,
} from './manage-logic';

describe('festivalHeadline', () => {
  it('summarizes festivals with pacing', () => {
    expect(
      festivalHeadline({
        sectionId: 's1',
        pacingState: 'behind',
        gapTeachingDays: 3,
        festivals: [{ id: '1', name: 'Dashain', startDate: 'a', endDate: 'b' }],
      }),
    ).toBe('1 festival(s) · pacing behind');
  });
});

describe('adminFestivalHeadline', () => {
  it('summarizes festivals with sections-behind counts', () => {
    expect(
      adminFestivalHeadline({
        schoolId: 'school-1',
        sectionsBehindCount: 1,
        sectionsTotal: 2,
        festivals: [{ id: '1', name: 'Dashain', startDate: 'a', endDate: 'b' }],
      }),
    ).toBe('1 festival(s) · 1/2 sections behind');
  });
});

describe('pickDefaultSettlingBandId', () => {
  it('prefers pre_primary when present', () => {
    expect(
      pickDefaultSettlingBandId([
        { id: 'early', code: 'early_primary' },
        { id: 'pp', code: 'pre_primary' },
      ]),
    ).toBe('pp');
  });

  it('falls back to first band when pre_primary is absent', () => {
    expect(
      pickDefaultSettlingBandId([{ id: 'early', code: 'early_primary' }]),
    ).toBe('early');
  });

  it('returns null for an empty band list', () => {
    expect(pickDefaultSettlingBandId([])).toBeNull();
  });
});
