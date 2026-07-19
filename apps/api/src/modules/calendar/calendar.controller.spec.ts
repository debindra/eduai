import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request } from 'express';
import { getMockRequestUser } from '../../test-utils/factories';
import { CalendarController } from './calendar.controller';
import type { CalendarService } from './calendar.service';
import type { CalendarSetupDto } from './dto/calendar-setup.dto';

describe('CalendarController endpoints', () => {
  let controller: CalendarController;
  let calendarService: {
    setupCalendar: ReturnType<typeof vi.fn>;
    getCalendarStatus: ReturnType<typeof vi.fn>;
    getFestivalTemplate: ReturnType<typeof vi.fn>;
    patchFestivalTemplate: ReturnType<typeof vi.fn>;
    approveCalendar: ReturnType<typeof vi.fn>;
    getTeachingDays: ReturnType<typeof vi.fn>;
    getCalendarView: ReturnType<typeof vi.fn>;
  };

  const setupDto: CalendarSetupDto = {
    academicYearLabel: '2082/83',
    sessionStart: '2025-04-14',
    sessionEnd: '2026-04-13',
    weeklyOffs: [6],
    terminals: [
      {
        name: 'Terminal 1',
        sortOrder: 1,
        startDate: '2025-04-14',
        endDate: '2025-08-31',
        reportingType: 'formative',
      },
    ],
  };

  beforeEach(() => {
    calendarService = {
      setupCalendar: vi.fn(),
      getCalendarStatus: vi.fn(),
      getFestivalTemplate: vi.fn(),
      patchFestivalTemplate: vi.fn(),
      approveCalendar: vi.fn(),
      getTeachingDays: vi.fn(),
      getCalendarView: vi.fn(),
    };
    controller = new CalendarController(
      calendarService as unknown as CalendarService,
    );
  });

  it('POST /calendar/:schoolId/setup delegates to setupCalendar', async () => {
    calendarService.setupCalendar.mockResolvedValue({
      schoolCalendarId: 'cal-1',
      academicYearLabel: '2082/83',
      approvalStatus: 'draft',
    });

    const actual = await controller.setup('school-1', setupDto);

    expect(calendarService.setupCalendar).toHaveBeenCalledWith(
      'school-1',
      setupDto,
    );
    expect(actual.schoolCalendarId).toBe('cal-1');
  });

  it('GET /calendar/:schoolId/status delegates to getCalendarStatus', async () => {
    calendarService.getCalendarStatus.mockResolvedValue({
      approvalStatus: 'approved',
      schoolCalendarId: 'cal-1',
      academicYearLabel: '2082',
    });

    const actual = await controller.getCalendarStatus('school-1');

    expect(calendarService.getCalendarStatus).toHaveBeenCalledWith('school-1');
    expect(actual.approvalStatus).toBe('approved');
  });

  it('GET /calendar/:schoolId/festival-template delegates to getFestivalTemplate', async () => {
    calendarService.getFestivalTemplate.mockResolvedValue({
      schoolCalendarId: 'cal-1',
      closures: [],
    });

    const actual = await controller.getFestivalTemplate('school-1');

    expect(calendarService.getFestivalTemplate).toHaveBeenCalledWith('school-1');
    expect(actual).toEqual({ schoolCalendarId: 'cal-1', closures: [] });
  });

  it('PATCH /calendar/:schoolId/festival-template delegates to patchFestivalTemplate', async () => {
    const dto = {
      closures: [
        {
          id: 'c1',
          name: 'Dashain',
          startDate: '2025-10-01',
          endDate: '2025-10-10',
          category: 'school_holiday' as const,
        },
      ],
    };
    calendarService.patchFestivalTemplate.mockResolvedValue({
      schoolCalendarId: 'cal-1',
      closures: [{ ...dto.closures[0], source: 'local' as const }],
    });

    const actual = await controller.patchFestivalTemplate('school-1', dto);

    expect(calendarService.patchFestivalTemplate).toHaveBeenCalledWith(
      'school-1',
      dto,
    );
    expect(actual.closures).toHaveLength(1);
  });

  it('POST /calendar/:schoolId/approve uses request identityId', async () => {
    const user = getMockRequestUser({
      identityId: 'identity-admin',
      memberships: [
        {
          id: 'm1',
          schoolId: 'school-1',
          memberType: 'admin',
          status: 'active',
          teacherId: null,
          adminId: 'admin-1',
        },
      ],
    });
    calendarService.approveCalendar.mockResolvedValue({
      schoolCalendarId: 'cal-1',
      approvalStatus: 'approved',
      approvedAt: '2025-04-20T00:00:00Z',
    });

    const actual = await controller.approve('school-1', {
      user,
    } as Request);

    expect(calendarService.approveCalendar).toHaveBeenCalledWith(
      'school-1',
      'identity-admin',
    );
    expect(actual.approvalStatus).toBe('approved');
  });

  it('GET /calendar/:schoolId/teaching-days delegates to getTeachingDays', async () => {
    calendarService.getTeachingDays.mockResolvedValue({
      schoolId: 'school-1',
      terminals: [],
    });

    const actual = await controller.getTeachingDays('school-1');

    expect(calendarService.getTeachingDays).toHaveBeenCalledWith('school-1');
    expect(actual.schoolId).toBe('school-1');
  });

  it('GET /calendar/:schoolId/view delegates to getCalendarView', async () => {
    calendarService.getCalendarView.mockResolvedValue({
      schoolId: 'school-1',
      approvalStatus: 'approved',
      nationalClosures: [],
      closures: [],
      terminals: [],
    });

    const actual = await controller.getCalendarView('school-1');

    expect(calendarService.getCalendarView).toHaveBeenCalledWith('school-1');
    expect(actual.approvalStatus).toBe('approved');
  });
});
