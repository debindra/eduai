import { apiFetch } from '../../lib/shared/api/client';
import { requireResolvedSchoolId } from '../../lib/shared/stores/school-scope';
import type { components } from '../../lib/shared/api/generated-types';

type CalendarSetupRequest = components['schemas']['CalendarSetupDto'];
type CalendarSetupResponse = components['schemas']['CalendarSetupResponseDto'];
type CalendarStatusResponse = components['schemas']['CalendarStatusResponseDto'];
type FestivalTemplateResponse = components['schemas']['FestivalTemplateResponseDto'];
type FestivalTemplatePatch = components['schemas']['PatchFestivalTemplateDto'];
type CalendarApproveResponse = components['schemas']['ApproveCalendarResponseDto'];
type TeachingDaysResponse = components['schemas']['TeachingDaysResponseDto'];

function calendarPath(suffix: string): string {
  return `/calendar/${requireResolvedSchoolId()}${suffix}`;
}

export async function setupCalendar(
  payload: CalendarSetupRequest,
): Promise<CalendarSetupResponse> {
  return apiFetch<CalendarSetupResponse>(calendarPath('/setup'), {
    method: 'POST',
    body: payload,
  });
}

export type CalendarDraftResponse = {
  schoolCalendarId: string;
  academicYearLabel: string;
  approvalStatus: 'draft';
  clonedFromApproved?: boolean;
  hasLiveApproved?: boolean;
};

/** Resume draft or clone live approved into a new editable draft. */
export async function ensureCalendarDraft(): Promise<CalendarDraftResponse> {
  return apiFetch<CalendarDraftResponse>(calendarPath('/ensure-draft'), {
    method: 'POST',
  });
}

/** Update session / terminals on the current draft only. */
export async function updateCalendarSetup(
  payload: CalendarSetupRequest,
): Promise<CalendarDraftResponse> {
  return apiFetch<CalendarDraftResponse>(calendarPath('/setup'), {
    method: 'PATCH',
    body: payload,
  });
}

export async function getCalendarStatus(): Promise<CalendarStatusResponse> {
  return apiFetch<CalendarStatusResponse>(calendarPath('/status'));
}

export async function getFestivalTemplate(): Promise<FestivalTemplateResponse> {
  return apiFetch<FestivalTemplateResponse>(calendarPath('/festival-template'));
}

export async function patchFestivalTemplate(
  payload: FestivalTemplatePatch,
): Promise<FestivalTemplateResponse> {
  return apiFetch<FestivalTemplateResponse>(calendarPath('/festival-template'), {
    method: 'PATCH',
    body: payload,
  });
}

export async function approveCalendar(): Promise<CalendarApproveResponse> {
  return apiFetch<CalendarApproveResponse>(calendarPath('/approve'), {
    method: 'POST',
  });
}

export async function getTeachingDays(): Promise<TeachingDaysResponse> {
  return apiFetch<TeachingDaysResponse>(calendarPath('/teaching-days'));
}

export async function getWeeklyOffPreset(
  bsYear: number,
): Promise<{ bsYear: number; weeklyOffs: number[]; fromNational: boolean }> {
  return apiFetch(calendarPath(`/weekly-off-preset?bsYear=${bsYear}`));
}

/** Shared read-only calendar board (admin / teacher / platform support). */
export type CalendarViewResponse = {
  schoolId: string;
  approvalStatus: 'none' | 'draft' | 'approved';
  schoolCalendarId?: string;
  academicYearLabel?: string;
  bsYear?: number;
  sessionStart?: string;
  sessionEnd?: string;
  /** ISO weekdays 1=Mon … 7=Sun (matches teaching_days / weekly_offs). */
  weeklyOffs?: number[];
  nationalClosures: Array<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    source: string;
    category?: string;
  }>;
  closures: Array<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    source: string;
    category?: 'school_holiday' | 'eca' | 'cca';
  }>;
  terminals: Array<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  }>;
};

export async function getCalendarView(): Promise<CalendarViewResponse> {
  return apiFetch<CalendarViewResponse>(calendarPath('/view'));
}
