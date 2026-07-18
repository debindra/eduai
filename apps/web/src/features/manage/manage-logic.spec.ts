import { describe, expect, it } from 'vitest';
import { adminFestivalHeadline, festivalHeadline } from './manage-logic';

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
