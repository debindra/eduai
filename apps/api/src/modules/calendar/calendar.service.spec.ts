import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarService } from './calendar.service';
import type { CalendarRepository } from './calendar.repository';
import type { CalendarSetupDto } from './dto/calendar-setup.dto';
import type { NationalCalendarService } from '../platform/national-calendar.service';

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
    listSchoolClosures: ReturnType<typeof vi.fn>;
    upsertFestivalClosure: ReturnType<typeof vi.fn>;
    upsertLocalClosure: ReturnType<typeof vi.fn>;
  };
  let nationalCalendar: {
    listPublishedClosuresForBsYear: ReturnType<typeof vi.fn>;
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
      listSchoolClosures: vi.fn(),
      upsertFestivalClosure: vi.fn(),
      upsertLocalClosure: vi.fn(),
    };
    nationalCalendar = {
      listPublishedClosuresForBsYear: vi.fn().mockResolvedValue([
        {
          id: 'nat-1',
          name: 'Dashain',
          startDate: '2025-10-02',
          endDate: '2025-10-12',
          category: 'festival',
        },
      ]),
    };
    service = new CalendarService(
      repository as unknown as CalendarRepository,
      nationalCalendar as unknown as NationalCalendarService,
    );
  });

  describe('setupCalendar', () => {
    it('rejects when a draft calendar already exists', async () => {
      repository.findDraftCalendar.mockResolvedValue({ id: 'cal-existing' });
      await expect(
        service.setupCalendar('school-1', getMockSetupDto()),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.insertCalendar).not.toHaveBeenCalled();
    });

    it('creates calendar and terminals without hardcoded festival template', async () => {
      repository.findDraftCalendar.mockResolvedValue(null);
      repository.insertCalendar.mockResolvedValue({
        id: 'cal-1',
        academic_year_label: '2082',
      });
      repository.insertTerminals.mockResolvedValue(undefined);

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
      expect(repository.insertFestivalClosures).not.toHaveBeenCalled();
    });
  });

  describe('getCalendarStatus', () => {
    it('returns draft calendar when one exists', async () => {
      repository.findDraftCalendar.mockResolvedValue({
        id: 'cal-draft',
        academic_year_label: '2082/83',
      });
      await expect(service.getCalendarStatus('school-1')).resolves.toEqual({
        approvalStatus: 'draft',
        schoolCalendarId: 'cal-draft',
        academicYearLabel: '2082/83',
      });
    });

    it('returns approved when no draft but latest exists', async () => {
      repository.findDraftCalendar.mockResolvedValue(null);
      repository.findLatestCalendar.mockResolvedValue({
        id: 'cal-approved',
        academic_year_label: '2082',
        approval_status: 'approved',
      });
      await expect(service.getCalendarStatus('school-1')).resolves.toEqual({
        approvalStatus: 'approved',
        schoolCalendarId: 'cal-approved',
        academicYearLabel: '2082',
      });
    });

    it('returns none when no calendar', async () => {
      repository.findDraftCalendar.mockResolvedValue(null);
      repository.findLatestCalendar.mockResolvedValue(null);
      await expect(service.getCalendarStatus('school-1')).resolves.toEqual({
        approvalStatus: 'none',
      });
    });
  });

  describe('getFestivalTemplate', () => {
    it('requires a draft calendar', async () => {
      repository.findDraftCalendar.mockResolvedValue(null);
      await expect(service.getFestivalTemplate('school-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns national closures read-only plus school local closures', async () => {
      repository.findDraftCalendar.mockResolvedValue({
        id: 'cal-1',
        session_start: '2025-04-14',
      });
      repository.listSchoolClosures.mockResolvedValue([
        {
          id: 'loc-1',
          name: 'Local PD day',
          start_date: '2025-06-01',
          end_date: '2025-06-01',
          source: 'local',
        },
      ]);
      const actual = await service.getFestivalTemplate('school-1');
      expect(actual.nationalClosures?.[0]).toMatchObject({
        name: 'Dashain',
        source: 'national',
        readOnly: true,
      });
      expect(actual.closures[0]).toMatchObject({
        name: 'Local PD day',
        source: 'local',
        readOnly: false,
      });
    });
  });

  describe('approveCalendar', () => {
    it('approves a draft calendar', async () => {
      repository.findDraftCalendar.mockResolvedValue({ id: 'cal-1' });
      repository.approveCalendar.mockResolvedValue({
        id: 'cal-1',
        approved_at: '2025-05-01T00:00:00.000Z',
      });
      await expect(service.approveCalendar('school-1', 'identity-1')).resolves.toEqual({
        schoolCalendarId: 'cal-1',
        approvalStatus: 'approved',
        approvedAt: '2025-05-01T00:00:00.000Z',
      });
    });

    it('rejects when no draft', async () => {
      repository.findDraftCalendar.mockResolvedValue(null);
      await expect(
        service.approveCalendar('school-1', 'identity-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getTeachingDays', () => {
    it('aggregates per-terminal counts', async () => {
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
      await expect(service.getTeachingDays('school-1')).resolves.toEqual({
        schoolId: 'school-1',
        terminals: [
          { terminalId: 't1', terminalName: 'Terminal 1', teachingDayCount: 2 },
          { terminalId: 't2', terminalName: 'Terminal 2', teachingDayCount: 1 },
        ],
      });
    });

    it('rejects when no calendar', async () => {
      repository.findLatestCalendar.mockResolvedValue(null);
      await expect(service.getTeachingDays('school-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
