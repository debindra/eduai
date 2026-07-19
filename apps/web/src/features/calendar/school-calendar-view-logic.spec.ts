import { describe, expect, it } from 'vitest';
import {
  boardPropsFromView,
  formatAcademicCalendarTitle,
  isConfiguredCalendarView,
} from './school-calendar-view-logic';
import type { CalendarViewResponse } from './api';

const baseView = (): CalendarViewResponse => ({
  schoolId: 'school-1',
  approvalStatus: 'approved',
  academicYearLabel: '2082/83',
  bsYear: 2082,
  sessionStart: '2025-04-14',
  sessionEnd: '2026-04-13',
  weeklyOffs: [6, 7],
  nationalClosures: [
    {
      id: 'n1',
      name: 'Dashain',
      startDate: '2025-10-02',
      endDate: '2025-10-12',
      source: 'national',
      category: 'festival',
    },
  ],
  closures: [
    {
      id: 'c1',
      name: 'Sports',
      startDate: '2025-06-01',
      endDate: '2025-06-01',
      source: 'local',
      category: 'eca',
    },
  ],
  terminals: [],
});

describe('isConfiguredCalendarView', () => {
  it('rejects none / missing bsYear', () => {
    expect(
      isConfiguredCalendarView({
        schoolId: 's',
        approvalStatus: 'none',
        nationalClosures: [],
        closures: [],
        terminals: [],
      }),
    ).toBe(false);
    expect(
      isConfiguredCalendarView({
        ...baseView(),
        bsYear: undefined,
      }),
    ).toBe(false);
  });

  it('accepts draft and approved with bsYear', () => {
    expect(isConfiguredCalendarView(baseView())).toBe(true);
    expect(
      isConfiguredCalendarView({ ...baseView(), approvalStatus: 'draft' }),
    ).toBe(true);
  });
});

describe('formatAcademicCalendarTitle', () => {
  it('formats year label without status fluff', () => {
    expect(formatAcademicCalendarTitle('2082/83')).toBe('2082/83 Academic Calendar');
    expect(formatAcademicCalendarTitle(null)).toBe('Academic Calendar');
  });
});

describe('boardPropsFromView', () => {
  it('maps view fields identically for every role consumer', () => {
    expect(boardPropsFromView(baseView())).toEqual({
      bsYear: 2082,
      nationalClosures: baseView().nationalClosures,
      localClosures: baseView().closures,
      sessionStart: '2025-04-14',
      sessionEnd: '2026-04-13',
      weeklyOffs: [6, 7],
    });
  });

  it('defaults missing weeklyOffs to empty array', () => {
    const view = { ...baseView(), weeklyOffs: undefined };
    expect(boardPropsFromView(view)?.weeklyOffs).toEqual([]);
  });

  it('returns null when not configured', () => {
    expect(
      boardPropsFromView({
        schoolId: 's',
        approvalStatus: 'none',
        nationalClosures: [],
        closures: [],
        terminals: [],
      }),
    ).toBeNull();
  });
});
