import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/shared/api/client', () => ({
  apiFetch: vi.fn(),
}));

vi.mock('../../lib/shared/stores/session', () => ({
  getSession: vi.fn(),
}));

import { apiFetch } from '../../lib/shared/api/client';
import { getSession } from '../../lib/shared/stores/session';
import {
  approveCalendar,
  getCalendarStatus,
  getFestivalTemplate,
  getTeachingDays,
  patchFestivalTemplate,
  setupCalendar,
} from './api';

const mockApiFetch = vi.mocked(apiFetch);
const mockGetSession = vi.mocked(getSession);

describe('calendar api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSession.mockReturnValue({
      accessToken: 'token-1',
      identity: {
        id: 'identity-1',
        email: 'admin@schoolx.dev',
        phone: null,
        displayName: 'Admin',
      },
      memberType: 'admin',
      schoolId: 'school-1',
    });
  });

  it('setupCalendar posts to /calendar/:schoolId/setup', async () => {
    const payload = {
      academicYearLabel: '2082',
      sessionStart: '2025-04-14',
      sessionEnd: '2026-04-13',
      weeklyOffs: [6],
      terminals: [],
    };
    mockApiFetch.mockResolvedValue({
      schoolCalendarId: 'cal-1',
      academicYearLabel: '2082',
      approvalStatus: 'draft',
    });

    const actual = await setupCalendar(payload as never);

    expect(actual.schoolCalendarId).toBe('cal-1');
    expect(mockApiFetch).toHaveBeenCalledWith('/calendar/school-1/setup', {
      method: 'POST',
      body: payload,
    });
  });

  it('getCalendarStatus uses school-scoped path', async () => {
    mockApiFetch.mockResolvedValue({
      approvalStatus: 'approved',
      schoolCalendarId: 'cal-1',
      academicYearLabel: '2082',
    });
    const status = await getCalendarStatus();
    expect(status.approvalStatus).toBe('approved');
    expect(mockApiFetch).toHaveBeenCalledWith('/calendar/school-1/status');
  });

  it('festival and approve paths include schoolId', async () => {
    mockApiFetch.mockResolvedValue({ schoolCalendarId: 'cal-1', closures: [] });
    await getFestivalTemplate();
    expect(mockApiFetch).toHaveBeenCalledWith('/calendar/school-1/festival-template');

    await patchFestivalTemplate({
      closures: [{ name: 'Dashain', startDate: '2025-10-01', endDate: '2025-10-10' }],
    });
    expect(mockApiFetch).toHaveBeenCalledWith('/calendar/school-1/festival-template', {
      method: 'PATCH',
      body: {
        closures: [{ name: 'Dashain', startDate: '2025-10-01', endDate: '2025-10-10' }],
      },
    });

    mockApiFetch.mockResolvedValue({
      schoolCalendarId: 'cal-1',
      approvalStatus: 'approved',
      approvedAt: '2025-04-20T00:00:00Z',
    });
    await approveCalendar();
    expect(mockApiFetch).toHaveBeenCalledWith('/calendar/school-1/approve', {
      method: 'POST',
    });
  });

  it('getTeachingDays uses school-scoped path', async () => {
    mockApiFetch.mockResolvedValue({ schoolId: 'school-1', terminals: [] });
    const days = await getTeachingDays();
    expect(days).toEqual({ schoolId: 'school-1', terminals: [] });
    expect(mockApiFetch).toHaveBeenCalledWith('/calendar/school-1/teaching-days');
  });

  it('throws when session has no schoolId', async () => {
    mockGetSession.mockReturnValue(null);
    await expect(setupCalendar({} as never)).rejects.toThrow(/school context missing/);
  });
});
