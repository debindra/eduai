import { apiFetch } from '../../lib/shared/api/client';

export type PlatformSchool = {
  id: string;
  name: string;
  region: string | null;
  tier: string | null;
  licensedBandRange: string | null;
  exitStatus: string | null;
  calendarStatus: 'none' | 'draft' | 'approved';
  sectionsTotal: number;
  sectionsBehind: number;
  teachersTotal: number;
  studentsTotal: number;
  subjectsTotal: number;
};

export type CreatePlatformSchoolPayload = {
  name: string;
  region?: string;
  tier?: string;
  licensedBandRange?: string;
  adminEmail?: string;
  adminPhone?: string;
  adminDisplayName?: string;
};

export type CreatePlatformSchoolResponse = {
  school: PlatformSchool;
  admin: { identityId: string; delivery: 'email' | 'mobile' };
};

export type SupportSession = {
  id: string;
  schoolId: string;
  schoolName: string | null;
  reason: string;
  grantedBy: string | null;
  startsAt: string;
  expiresAt: string;
  status: 'pending' | 'active' | 'expired' | 'revoked';
};

export type NationalClosure = {
  id: string;
  name: string;
  category: 'govt_holiday' | 'festival' | 'day_off';
  startDate: string;
  endDate: string;
  bsLabel: string | null;
  movable: boolean;
};

export type NationalCalendar = {
  id: string;
  bsYear: number;
  status: 'draft' | 'published';
  weeklyOffs: number[];
  closures: NationalClosure[];
};

export async function listPlatformSchools(): Promise<{ schools: PlatformSchool[] }> {
  return apiFetch('/platform/schools');
}

export async function createPlatformSchool(
  payload: CreatePlatformSchoolPayload,
): Promise<CreatePlatformSchoolResponse> {
  return apiFetch('/platform/schools', { method: 'POST', body: payload });
}

export type PlatformCalendarSetupPayload = {
  academicYearLabel: string;
  sessionStart: string;
  sessionEnd: string;
  weeklyOffs: number[];
  terminals: Array<{
    name: string;
    sortOrder: number;
    startDate: string;
    endDate: string;
    reportingType: 'formative' | 'summative' | 'transition';
  }>;
};

export type PlatformCalendarSetupResponse = {
  schoolCalendarId: string;
  academicYearLabel: string;
  approvalStatus: 'draft';
  clonedFromApproved?: boolean;
  hasLiveApproved?: boolean;
};

export async function setupPlatformSchoolCalendar(
  schoolId: string,
  payload: PlatformCalendarSetupPayload,
): Promise<PlatformCalendarSetupResponse> {
  return apiFetch(`/platform/schools/${schoolId}/calendar`, {
    method: 'POST',
    body: payload,
  });
}

export async function ensurePlatformSchoolCalendarDraft(
  schoolId: string,
): Promise<PlatformCalendarSetupResponse> {
  return apiFetch(`/platform/schools/${schoolId}/calendar/ensure-draft`, {
    method: 'POST',
  });
}

export async function updatePlatformSchoolCalendarSetup(
  schoolId: string,
  payload: PlatformCalendarSetupPayload,
): Promise<PlatformCalendarSetupResponse> {
  return apiFetch(`/platform/schools/${schoolId}/calendar/setup`, {
    method: 'PATCH',
    body: payload,
  });
}

export type PlatformClosure = {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  category: 'school_holiday' | 'eca' | 'cca';
};

export type PlatformCalendarClosuresResponse = {
  schoolCalendarId: string;
  academicYearLabel?: string;
  approvalStatus?: 'draft' | 'approved';
  bsYear?: number;
  sessionStart?: string;
  sessionEnd?: string;
  /** ISO weekdays 1=Mon … 7=Sun */
  weeklyOffs?: number[];
  nationalClosures: Array<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    category?: string;
  }>;
  closures: Array<{
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    category?: 'school_holiday' | 'eca' | 'cca';
  }>;
};

export async function getPlatformSchoolCalendarClosures(
  schoolId: string,
): Promise<PlatformCalendarClosuresResponse> {
  return apiFetch(`/platform/schools/${schoolId}/calendar/closures`);
}

export async function patchPlatformSchoolCalendarClosures(
  schoolId: string,
  closures: PlatformClosure[],
): Promise<PlatformCalendarClosuresResponse> {
  return apiFetch(`/platform/schools/${schoolId}/calendar/closures`, {
    method: 'PATCH',
    body: { closures },
  });
}

export async function approvePlatformSchoolCalendar(
  schoolId: string,
): Promise<{ schoolCalendarId: string; approvalStatus: 'approved'; approvedAt: string }> {
  return apiFetch(`/platform/schools/${schoolId}/calendar/approve`, { method: 'POST' });
}

export async function listSupportSessions(): Promise<{ sessions: SupportSession[] }> {
  return apiFetch('/platform/support-sessions');
}

export async function createSupportSession(payload: {
  schoolId: string;
  reason: string;
  grantedBy?: string;
  expiresInHours?: number;
}): Promise<SupportSession> {
  return apiFetch('/platform/support-sessions', { method: 'POST', body: payload });
}

export async function revokeSupportSession(id: string): Promise<SupportSession> {
  return apiFetch(`/platform/support-sessions/${id}`, { method: 'DELETE' });
}

export async function listNationalCalendars(): Promise<{ calendars: NationalCalendar[] }> {
  return apiFetch('/platform/national-calendars');
}

export async function createNationalCalendar(bsYear: number): Promise<NationalCalendar> {
  return apiFetch('/platform/national-calendars', {
    method: 'POST',
    body: { bsYear },
  });
}

export async function patchNationalClosures(
  id: string,
  closures: Array<{
    id?: string;
    name: string;
    category: 'govt_holiday' | 'festival' | 'day_off';
    startDate: string;
    endDate: string;
    bsLabel?: string | null;
    movable?: boolean;
  }>,
): Promise<NationalCalendar> {
  return apiFetch(`/platform/national-calendars/${id}/closures`, {
    method: 'PATCH',
    body: { closures },
  });
}

export async function patchNationalWeeklyOffs(
  id: string,
  weeklyOffs: number[],
): Promise<NationalCalendar> {
  return apiFetch(`/platform/national-calendars/${id}/weekly-offs`, {
    method: 'PATCH',
    body: { weeklyOffs },
  });
}

export async function publishNationalCalendar(id: string): Promise<NationalCalendar> {
  return apiFetch(`/platform/national-calendars/${id}/publish`, { method: 'POST' });
}
