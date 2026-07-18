import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarService } from './calendar.service';
import type { CalendarRepository } from './calendar.repository';
import type { CalendarSetupDto } from './dto/calendar-setup.dto';

function getMockSetupDto(overrides?: Partial<CalendarSetupDto>): CalendarSetupDto {
  return {
    academicYearLabel: '2082',
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
    ...overrides,
  };
}

describe('CalendarService', () => {
  let service: CalendarService;
  let repository: {
    findDraftCalendar: ReturnType<typeof vi.fn>;
    insertCalendar: ReturnType<typeof vi.fn>;
    insertTerminals: ReturnType<typeof vi.fn>;
    insertFestivalClosures: ReturnType<typeof vi.fn>;
    approveCalendar: ReturnType<typeof vi.fn>;
    findLatestCalendar: ReturnType<typeof vi.fn>;
    listTerminals: ReturnType<typeof vi.fn>;
    listTeachingDays: ReturnType<typeof vi.fn>;
    listFestivalClosures: ReturnType<typeof vi.fn>;
    upsertFestivalClosure: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      findDraftCalendar: vi.fn(),
      insertCalendar: vi.fn(),
      insertTerminals: vi.fn(),
      insertFestivalClosures: vi.fn(),
      approveCalendar: vi.fn(),
      findLatestCalendar: vi.fn(),
      listTerminals: vi.fn(),
      listTeachingDays: vi.fn(),
      listFestivalClosures: vi.fn(),
      upsertFestivalClosure: vi.fn(),
    };
    service = new CalendarService(repository as unknown as CalendarRepository);
  });

  describe('setupCalendar', () => {
    it('rejects when a draft calendar already exists', async () => {
      repository.findDraftCalendar.mockResolvedValue({ id: 'cal-existing' });
      await expect(
        service.setupCalendar('school-1', getMockSetupDto()),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.insertCalendar).not.toHaveBeenCalled();
    });

    it('creates calendar, terminals, and festival template closures', async () => {
      repository.findDraftCalendar.mockResolvedValue(null);
      repository.insertCalendar.mockResolvedValue({
        id: 'cal-1',
        academic_year_label: '2082',
      });
      repository.insertTerminals.mockResolvedValue(undefined);
      repository.insertFestivalClosures.mockResolvedValue(undefined);

      const actual = await service.setupCalendar('school-1', getMockSetupDto());

      expect(actual).toEqual({
        schoolCalendarId: 'cal-1',
        academicYearLabel: '2082',
        approvalStatus: 'draft',
      });
      expect(repository.insertTerminals).toHaveBeenCalledWith(
        'cal-1',
        getMockSetupDto().terminals,
      );
      expect(repository.insertFestivalClosures).toHaveBeenCalledWith(
        'cal-1',
        expect.arrayContaining([
          expect.objectContaining({ name: expect.stringContaining('Dashain') }),
        ]),
      );
    });
  });

  describe('getCalendarStatus', () => {
    it('returns draft calendar when one exists', async () => {
      repository.findDraftCalendar.mockResolvedValue({
        id: 'cal-draft',
        academic_year_label: '2082/83',
      });

      const actual = await service.getCalendarStatus('school-1');

      expect(actual).toEqual({
        approvalStatus: 'draft',
        schoolCalendarId: 'cal-draft',
        academicYearLabel: '2082/83',
      });
      expect(repository.findLatestCalendar).not.toHaveBeenCalled();
    });

    it('returns latest approved calendar when no draft exists', async () => {
      repository.findDraftCalendar.mockResolvedValue(null);
      repository.findLatestCalendar.mockResolvedValue({
        id: 'cal-approved',
        approval_status: 'approved',
        academic_year_label: '2082',
      });

      const actual = await service.getCalendarStatus('school-1');

      expect(actual).toEqual({
        approvalStatus: 'approved',
        schoolCalendarId: 'cal-approved',
        academicYearLabel: '2082',
      });
    });

    it('returns none when no calendar exists', async () => {
      repository.findDraftCalendar.mockResolvedValue(null);
      repository.findLatestCalendar.mockResolvedValue(null);

      const actual = await service.getCalendarStatus('school-1');

      expect(actual).toEqual({ approvalStatus: 'none' });
    });
  });

  describe('getFestivalTemplate', () => {
    it('returns festival_template closures for a draft calendar', async () => {
      repository.findDraftCalendar.mockResolvedValue({ id: 'cal-1' });
      repository.listFestivalClosures.mockResolvedValue([
        {
          id: 'c1',
          name: 'Dashain',
          start_date: '2025-10-01',
          end_date: '2025-10-10',
        },
      ]);

      const actual = await service.getFestivalTemplate('school-1');

      expect(actual).toEqual({
        schoolCalendarId: 'cal-1',
        closures: [
          {
            id: 'c1',
            name: 'Dashain',
            startDate: '2025-10-01',
            endDate: '2025-10-10',
            source: 'festival_template',
          },
        ],
      });
    });

    it('throws when no draft calendar exists', async () => {
      repository.findDraftCalendar.mockResolvedValue(null);
      await expect(service.getFestivalTemplate('school-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('patchFestivalTemplate', () => {
    it('upserts closures on the draft calendar', async () => {
      repository.findDraftCalendar.mockResolvedValue({ id: 'cal-1' });
      repository.upsertFestivalClosure.mockResolvedValue({
        id: 'c1',
        name: 'Dashain',
        start_date: '2025-10-02',
        end_date: '2025-10-11',
      });

      const actual = await service.patchFestivalTemplate('school-1', {
        closures: [
          {
            id: 'c1',
            name: 'Dashain',
            startDate: '2025-10-02',
            endDate: '2025-10-11',
          },
        ],
      });

      expect(actual.closures[0]).toEqual({
        id: 'c1',
        name: 'Dashain',
        startDate: '2025-10-02',
        endDate: '2025-10-11',
        source: 'festival_template',
      });
      expect(repository.upsertFestivalClosure).toHaveBeenCalledWith('cal-1', {
        id: 'c1',
        name: 'Dashain',
        startDate: '2025-10-02',
        endDate: '2025-10-11',
      });
    });
  });

  describe('approveCalendar', () => {
    it('approves a draft calendar', async () => {
      repository.findDraftCalendar.mockResolvedValue({ id: 'cal-1' });
      repository.approveCalendar.mockResolvedValue({
        id: 'cal-1',
        approved_at: '2025-04-20T00:00:00Z',
      });

      const actual = await service.approveCalendar('school-1', 'identity-admin');

      expect(actual).toEqual({
        schoolCalendarId: 'cal-1',
        approvalStatus: 'approved',
        approvedAt: '2025-04-20T00:00:00Z',
      });
      expect(repository.approveCalendar).toHaveBeenCalledWith('cal-1', 'identity-admin');
    });

    it('throws when no draft calendar exists', async () => {
      repository.findDraftCalendar.mockResolvedValue(null);
      await expect(
        service.approveCalendar('school-1', 'identity-admin'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getTeachingDays', () => {
    it('returns per-terminal counts from the teaching_days view', async () => {
      repository.findLatestCalendar.mockResolvedValue({ id: 'cal-1' });
      repository.listTerminals.mockResolvedValue([
        { id: 't1', name: 'Terminal 1' },
        { id: 't2', name: 'Terminal 2' },
      ]);
      repository.listTeachingDays.mockResolvedValue([
        { terminal_id: 't1' },
        { terminal_id: 't1' },
        { terminal_id: 't2' },
      ]);

      const actual = await service.getTeachingDays('school-1');

      expect(actual).toEqual({
        schoolId: 'school-1',
        terminals: [
          { terminalId: 't1', terminalName: 'Terminal 1', teachingDayCount: 2 },
          { terminalId: 't2', terminalName: 'Terminal 2', teachingDayCount: 1 },
        ],
      });
    });

    it('throws when no calendar is configured', async () => {
      repository.findLatestCalendar.mockResolvedValue(null);
      await expect(service.getTeachingDays('school-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
