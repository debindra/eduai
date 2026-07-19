import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PlatformController } from './platform.controller';
import type { PlatformService } from './platform.service';
import type { RequestUser } from '../auth/types/request-user.types';

describe('PlatformController', () => {
  let controller: PlatformController;
  let service: {
    listSchools: ReturnType<typeof vi.fn>;
    createSchool: ReturnType<typeof vi.fn>;
    setupSchoolCalendar: ReturnType<typeof vi.fn>;
    ensureSchoolCalendarDraft: ReturnType<typeof vi.fn>;
    updateSchoolCalendarSetup: ReturnType<typeof vi.fn>;
    getSchoolCalendarClosures: ReturnType<typeof vi.fn>;
    patchSchoolCalendarClosures: ReturnType<typeof vi.fn>;
    approveSchoolCalendar: ReturnType<typeof vi.fn>;
    createSupportSession: ReturnType<typeof vi.fn>;
    listSupportSessions: ReturnType<typeof vi.fn>;
    revokeSupportSession: ReturnType<typeof vi.fn>;
  };

  const platformUser = {
    identityId: 'identity-pa',
    platformAdmin: { id: 'pa-1', displayName: 'Platform' },
  } as unknown as RequestUser;

  beforeEach(() => {
    service = {
      listSchools: vi.fn(),
      createSchool: vi.fn(),
      setupSchoolCalendar: vi.fn(),
      ensureSchoolCalendarDraft: vi.fn(),
      updateSchoolCalendarSetup: vi.fn(),
      getSchoolCalendarClosures: vi.fn(),
      patchSchoolCalendarClosures: vi.fn(),
      approveSchoolCalendar: vi.fn(),
      createSupportSession: vi.fn(),
      listSupportSessions: vi.fn(),
      revokeSupportSession: vi.fn(),
    };
    controller = new PlatformController(service as unknown as PlatformService);
  });

  it('GET /platform/schools delegates to PlatformService.listSchools', async () => {
    service.listSchools.mockResolvedValue({ schools: [] });
    await expect(controller.listSchools()).resolves.toEqual({ schools: [] });
  });

  it('POST /platform/schools delegates identityId and dto to createSchool', async () => {
    const dto = {
      name: 'School Y',
      adminEmail: 'admin@y.dev',
    };
    const response = {
      school: { id: 'school-1', name: 'School Y' },
      admin: { identityId: 'id-1', delivery: 'email' as const },
    };
    service.createSchool.mockResolvedValue(response);

    const actual = await controller.createSchool(dto, {
      user: platformUser,
    } as never);

    expect(service.createSchool).toHaveBeenCalledWith('identity-pa', dto);
    expect(actual).toEqual(response);
  });

  it('POST /platform/schools/:schoolId/calendar delegates to setupSchoolCalendar', async () => {
    const dto = {
      academicYearLabel: '2082/83',
      sessionStart: '2025-04-14',
      sessionEnd: '2026-03-31',
      weeklyOffs: [6],
      terminals: [
        {
          name: 'T1',
          sortOrder: 1,
          startDate: '2025-04-14',
          endDate: '2025-07-15',
          reportingType: 'formative' as const,
        },
      ],
    };
    service.setupSchoolCalendar.mockResolvedValue({
      schoolCalendarId: 'cal-1',
      academicYearLabel: '2082/83',
      approvalStatus: 'draft',
    });

    await controller.setupSchoolCalendar('school-1', dto, {
      user: platformUser,
    } as never);

    expect(service.setupSchoolCalendar).toHaveBeenCalledWith(
      'identity-pa',
      'school-1',
      dto,
    );
  });

  it('POST /platform/support-sessions uses platformAdmin id', async () => {
    const dto = { schoolId: 'school-1', reason: 'Setup' };
    service.createSupportSession.mockResolvedValue({ id: 'sess-1' });

    await controller.createSupportSession(dto, { user: platformUser } as never);

    expect(service.createSupportSession).toHaveBeenCalledWith('pa-1', dto);
  });
});
