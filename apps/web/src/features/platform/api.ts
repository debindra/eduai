import { apiFetch } from '../../lib/shared/api/client';

export type PlatformSchool = {
  id: string;
  name: string;
  region: string | null;
  tier: string | null;
  licensedBandRange: string | null;
  exitStatus: string | null;
  sectionsTotal: number;
  sectionsBehind: number;
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
  closures: NationalClosure[];
};

export async function listPlatformSchools(): Promise<{ schools: PlatformSchool[] }> {
  return apiFetch('/platform/schools');
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

export async function publishNationalCalendar(id: string): Promise<NationalCalendar> {
  return apiFetch(`/platform/national-calendars/${id}/publish`, { method: 'POST' });
}
