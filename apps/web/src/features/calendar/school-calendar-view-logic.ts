import type { CalendarViewResponse } from './api';

/** Props shared by every role’s configured school calendar board. */
export type SchoolCalendarBoardProps = {
  bsYear: number;
  nationalClosures: CalendarViewResponse['nationalClosures'];
  localClosures: CalendarViewResponse['closures'];
  sessionStart: string | null;
  sessionEnd: string | null;
  weeklyOffs: number[];
};

/** True when the school has a draft or approved calendar the board can render. */
export function isConfiguredCalendarView(
  view: CalendarViewResponse | null | undefined,
): view is CalendarViewResponse & { bsYear: number } {
  return (
    !!view &&
    view.approvalStatus !== 'none' &&
    typeof view.bsYear === 'number'
  );
}

/** Clean page title shared by teacher / admin approved calendar views. */
export function formatAcademicCalendarTitle(
  academicYearLabel: string | null | undefined,
): string {
  const year = academicYearLabel?.trim();
  return year ? `${year} Academic Calendar` : 'Academic Calendar';
}

/**
 * Single mapping from /calendar/:schoolId/view → CalendarBoard props.
 * Admin, teacher, and platform (support session) must all use this so
 * weekly offs, national, and local markers stay identical.
 */
export function boardPropsFromView(
  view: CalendarViewResponse,
): SchoolCalendarBoardProps | null {
  if (!isConfiguredCalendarView(view)) {
    return null;
  }
  return {
    bsYear: view.bsYear,
    nationalClosures: view.nationalClosures,
    localClosures: view.closures,
    sessionStart: view.sessionStart ?? null,
    sessionEnd: view.sessionEnd ?? null,
    weeklyOffs: view.weeklyOffs ?? [],
  };
}
