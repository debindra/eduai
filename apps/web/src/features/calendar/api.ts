import { apiFetch } from '../../lib/shared/api/client';
import { getSession } from '../../lib/shared/stores/session';
import type { components } from '../../lib/shared/api/generated-types';

type CalendarSetupRequest = components['schemas']['CalendarSetupRequest'];
type CalendarSetupResponse = components['schemas']['CalendarSetupResponse'];
type CalendarStatusResponse = components['schemas']['CalendarStatusResponse'];
type FestivalTemplateResponse = components['schemas']['FestivalTemplateResponse'];
type FestivalTemplatePatch = components['schemas']['FestivalTemplatePatch'];
type CalendarApproveResponse = components['schemas']['CalendarApproveResponse'];
type TeachingDaysResponse = components['schemas']['TeachingDaysResponse'];

function requireSchoolId(): string {
  const schoolId = getSession()?.schoolId;
  if (!schoolId) {
    throw new Error('Not signed in — school context missing');
  }
  return schoolId;
}

function calendarPath(suffix: string): string {
  return `/calendar/${requireSchoolId()}${suffix}`;
}

export async function setupCalendar(
  payload: CalendarSetupRequest,
): Promise<CalendarSetupResponse> {
  return apiFetch<CalendarSetupResponse>(calendarPath('/setup'), {
    method: 'POST',
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
