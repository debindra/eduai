import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarService } from './calendar.service';
import type { CalendarRepository } from './calendar.repository';
import type { CalendarSetupDto } from './dto/calendar-setup.dto';
import type { EcaCcaService } from '../eca-cca/eca-cca.service';
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
    findApprovedCalendar: ReturnType<typeof vi.fn>;
    insertCalendar: ReturnType<typeof vi.fn>;
    insertTerminals: ReturnType<typeof vi.fn>;
    insertFestivalClosures: ReturnType<typeof vi.fn>;
    approveCalendar: ReturnType<typeof vi.fn>;
    supersedeApprovedForSchoolYear: ReturnType<typeof vi.fn>;
    findLatestCalendar: ReturnType<typeof vi.fn>;
    listTerminals: ReturnType<typeof vi.fn>;
    listTeachingDays: ReturnType<typeof vi.fn>;
    listFestivalClosures: ReturnType<typeof vi.fn>;
    listSchoolClosures: ReturnType<typeof vi.fn>;
    upsertFestivalClosure: ReturnType<typeof vi.fn>;
    upsertLocalClosure: ReturnType<typeof vi.fn>;
    deleteLocalClosure: ReturnType<typeof vi.fn>;
    updateDraftCalendar: ReturnType<typeof vi.fn>;
    deleteTerminalsForCalendar: ReturnType<typeof vi.fn>;
    copyClosures: ReturnType<typeof vi.fn>;
  };
  let nationalCalendar: {
    listPublishedClosuresForBsYear: ReturnType<typeof vi.fn>;
    getPublishedWeeklyOffs: ReturnType<typeof vi.fn>;
  };
  let ecaCca: {
    listSchoolItems: ReturnType<typeof vi.fn>;
    resolveActiveSchoolItem: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      findDraftCalendar: vi.fn(),
      findApprovedCalendar: vi.fn(),
      insertCalendar: vi.fn(),
      insertTerminals: vi.fn(),
      insertFestivalClosures: vi.fn(),
      approveCalendar: vi.fn(),
      supersedeApprovedForSchoolYear: vi.fn(),
      findLatestCalendar: vi.fn(),
      listTerminals: vi.fn(),
      listTeachingDays: vi.fn(),
      listFestivalClosures: vi.fn(),
      listSchoolClosures: vi.fn(),
      upsertFestivalClosure: vi.fn(),
      upsertLocalClosure: vi.fn(),
      deleteLocalClosure: vi.fn(),
      updateDraftCalendar: vi.fn(),
      deleteTerminalsForCalendar: vi.fn(),
      copyClosures: vi.fn(),
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
      getPublishedWeeklyOffs: vi.fn().mockResolvedValue([6]),
    };
    ecaCca = {
      listSchoolItems: vi.fn().mockResolvedValue([]),
      resolveActiveSchoolItem: vi.fn(),
    };
    service = new CalendarService(
      repository as unknown as CalendarRepository,
      nationalCalendar as unknown as NationalCalendarService,
      ecaCca as unknown as EcaCcaService,
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
      repository.findApprovedCalendar.mockResolvedValue(null);
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
        clonedFromApproved: false,
        hasLiveApproved: false,
      });
      expect(repository.insertTerminals).toHaveBeenCalledWith(
        'cal-1',
        getMockSetupDto().terminals,
      );
      expect(repository.insertFestivalClosures).not.toHaveBeenCalled();
    });
  });

  describe('ensureEditableDraft', () => {
    it('returns existing draft without cloning', async () => {
      repository.findDraftCalendar.mockResolvedValue({
        id: 'cal-draft',
        academic_year_label: '2082/83',
      });
      repository.findApprovedCalendar.mockResolvedValue({ id: 'cal-approved' });

      await expect(service.ensureEditableDraft('school-1')).resolves.toEqual({
        schoolCalendarId: 'cal-draft',
        academicYearLabel: '2082/83',
        approvalStatus: 'draft',
        clonedFromApproved: false,
        hasLiveApproved: true,
      });
      expect(repository.insertCalendar).not.toHaveBeenCalled();
    });

    it('clones approved into a new draft', async () => {
      repository.findDraftCalendar.mockResolvedValue(null);
      repository.findApprovedCalendar.mockResolvedValue({
        id: 'cal-approved',
        academic_year_label: '2082/83',
        session_start: '2025-04-14',
        session_end: '2026-03-31',
        weekly_offs: [6],
      });
      repository.listTerminals.mockResolvedValue([
        {
          id: 't1',
          name: 'T1',
          sort_order: 1,
          start_date: '2025-04-14',
          end_date: '2025-07-15',
          reporting_type: 'formative',
        },
      ]);
      repository.insertCalendar.mockResolvedValue({
        id: 'cal-draft',
        academic_year_label: '2082/83',
      });
      repository.insertTerminals.mockResolvedValue([]);
      repository.copyClosures.mockResolvedValue([]);

      const actual = await service.ensureEditableDraft('school-1');

      expect(actual).toEqual({
        schoolCalendarId: 'cal-draft',
        academicYearLabel: '2082/83',
        approvalStatus: 'draft',
        clonedFromApproved: true,
        hasLiveApproved: true,
      });
      expect(repository.copyClosures).toHaveBeenCalledWith('cal-approved', 'cal-draft');
    });

    it('rejects when neither draft nor approved exists', async () => {
      repository.findDraftCalendar.mockResolvedValue(null);
      repository.findApprovedCalendar.mockResolvedValue(null);
      await expect(service.ensureEditableDraft('school-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getCalendarStatus', () => {
    it('returns draft calendar when one exists', async () => {
      repository.findDraftCalendar.mockResolvedValue({
        id: 'cal-draft',
        academic_year_label: '2082/83',
      });
      repository.findApprovedCalendar.mockResolvedValue({ id: 'cal-approved' });
      await expect(service.getCalendarStatus('school-1')).resolves.toEqual({
        approvalStatus: 'draft',
        schoolCalendarId: 'cal-draft',
        academicYearLabel: '2082/83',
        hasLiveApproved: true,
      });
    });

    it('returns approved when no draft but approved exists', async () => {
      repository.findDraftCalendar.mockResolvedValue(null);
      repository.findApprovedCalendar.mockResolvedValue({
        id: 'cal-approved',
        academic_year_label: '2082',
        approval_status: 'approved',
      });
      await expect(service.getCalendarStatus('school-1')).resolves.toEqual({
        approvalStatus: 'approved',
        schoolCalendarId: 'cal-approved',
        academicYearLabel: '2082',
        hasLiveApproved: true,
      });
    });

    it('returns none when no calendar', async () => {
      repository.findDraftCalendar.mockResolvedValue(null);
      repository.findApprovedCalendar.mockResolvedValue(null);
      await expect(service.getCalendarStatus('school-1')).resolves.toEqual({
        approvalStatus: 'none',
        hasLiveApproved: false,
      });
    });
  });

  describe('getFestivalTemplate', () => {
    it('requires a draft or approved calendar', async () => {
      repository.findDraftCalendar.mockResolvedValue(null);
      repository.findApprovedCalendar.mockResolvedValue(null);
      await expect(service.getFestivalTemplate('school-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns national closures read-only plus school local closures', async () => {
      repository.findDraftCalendar.mockResolvedValue({
        id: 'cal-1',
        academic_year_label: '2082/83',
        approval_status: 'draft',
        session_start: '2025-04-14',
        session_end: '2026-04-13',
        weekly_offs: [6, 7],
      });
      repository.listSchoolClosures.mockResolvedValue([
        {
          id: 'loc-1',
          name: 'Local PD day',
          start_date: '2025-06-01',
          end_date: '2025-06-01',
          source: 'local',
          category: 'school_holiday',
          school_activity_id: null,
        },
      ]);
      const actual = await service.getFestivalTemplate('school-1');
      expect(actual.approvalStatus).toBe('draft');
      expect(actual.academicYearLabel).toBe('2082/83');
      expect(actual.sessionStart).toBe('2025-04-14');
      expect(actual.sessionEnd).toBe('2026-04-13');
      expect(actual.weeklyOffs).toEqual([6, 7]);
      expect(actual.nationalClosures?.[0]).toMatchObject({
        name: 'Dashain',
        source: 'national',
        readOnly: true,
      });
      expect(actual.closures[0]).toMatchObject({
        name: 'Local PD day',
        source: 'local',
        category: 'school_holiday',
        readOnly: false,
      });
    });

    it('falls back to approved calendar as view-only', async () => {
      repository.findDraftCalendar.mockResolvedValue(null);
      repository.findApprovedCalendar.mockResolvedValue({
        id: 'cal-approved',
        academic_year_label: '2082/83',
        approval_status: 'approved',
        session_start: '2025-04-14',
        session_end: '2026-04-13',
        weekly_offs: [6],
      });
      repository.listSchoolClosures.mockResolvedValue([
        {
          id: 'loc-1',
          name: 'Local PD day',
          start_date: '2025-06-01',
          end_date: '2025-06-01',
          source: 'local',
          category: 'school_holiday',
          school_activity_id: null,
        },
      ]);
      const actual = await service.getFestivalTemplate('school-1');
      expect(actual.approvalStatus).toBe('approved');
      expect(actual.academicYearLabel).toBe('2082/83');
      expect(actual.schoolCalendarId).toBe('cal-approved');
      expect(actual.closures[0]?.readOnly).toBe(true);
    });
  });

  describe('patchFestivalTemplate', () => {
    it('upserts closures with category and deletes removed rows', async () => {
      repository.findDraftCalendar.mockResolvedValue({
        id: 'cal-1',
        session_start: '2025-04-14',
      });
      repository.listSchoolClosures.mockResolvedValue([
        {
          id: 'old-1',
          name: 'Remove me',
          start_date: '2025-05-01',
          end_date: '2025-05-01',
          source: 'local',
          category: 'school_holiday',
          school_activity_id: null,
        },
      ]);
      repository.upsertLocalClosure.mockResolvedValue({
        id: 'new-1',
        name: 'Sports day',
        start_date: '2025-06-01',
        end_date: '2025-06-01',
        source: 'local',
        category: 'eca',
        school_activity_id: null,
      });
      const actual = await service.patchFestivalTemplate('school-1', {
        closures: [
          {
            name: 'Sports day',
            startDate: '2025-06-01',
            endDate: '2025-06-01',
            category: 'eca',
          },
        ],
      });
      expect(repository.deleteLocalClosure).toHaveBeenCalledWith('cal-1', 'old-1');
      expect(repository.upsertLocalClosure).toHaveBeenCalledWith('cal-1', {
        name: 'Sports day',
        startDate: '2025-06-01',
        endDate: '2025-06-01',
        category: 'eca',
        schoolActivityId: null,
      });
      expect(actual.closures[0]).toMatchObject({
        id: 'new-1',
        category: 'eca',
        source: 'local',
        schoolActivityId: null,
        iconKey: null,
      });
    });

    it('resolves schoolActivityId and sets category from activity kind', async () => {
      repository.findDraftCalendar.mockResolvedValue({
        id: 'cal-1',
        session_start: '2025-04-14',
      });
      repository.listSchoolClosures.mockResolvedValue([]);
      ecaCca.resolveActiveSchoolItem.mockResolvedValue({
        id: 'act-1',
        name: 'Sports Day',
        kind: 'eca',
        iconKey: 'sports',
        isActive: true,
      });
      ecaCca.listSchoolItems.mockResolvedValue([
        { id: 'act-1', iconKey: 'sports' },
      ]);
      repository.upsertLocalClosure.mockResolvedValue({
        id: 'new-1',
        name: 'Sports Day',
        start_date: '2025-06-01',
        end_date: '2025-06-01',
        source: 'local',
        category: 'eca',
        school_activity_id: 'act-1',
      });
      const actual = await service.patchFestivalTemplate('school-1', {
        closures: [
          {
            name: '',
            startDate: '2025-06-01',
            endDate: '2025-06-01',
            category: 'cca',
            schoolActivityId: 'act-1',
          },
        ],
      });
      expect(ecaCca.resolveActiveSchoolItem).toHaveBeenCalledWith('school-1', 'act-1');
      expect(repository.upsertLocalClosure).toHaveBeenCalledWith('cal-1', {
        name: 'Sports Day',
        startDate: '2025-06-01',
        endDate: '2025-06-01',
        category: 'eca',
        schoolActivityId: 'act-1',
      });
      expect(actual.closures[0]).toMatchObject({
        schoolActivityId: 'act-1',
        iconKey: 'sports',
        category: 'eca',
      });
    });

    it('rejects school_holiday with schoolActivityId', async () => {
      repository.findDraftCalendar.mockResolvedValue({
        id: 'cal-1',
        session_start: '2025-04-14',
      });
      repository.listSchoolClosures.mockResolvedValue([]);
      await expect(
        service.patchFestivalTemplate('school-1', {
          closures: [
            {
              name: 'Holiday',
              startDate: '2025-06-01',
              endDate: '2025-06-01',
              category: 'school_holiday',
              schoolActivityId: 'act-1',
            },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('approveCalendar', () => {
    it('supersedes previous approved then promotes draft', async () => {
      repository.findDraftCalendar.mockResolvedValue({
        id: 'cal-draft',
        academic_year_label: '2082/83',
      });
      repository.supersedeApprovedForSchoolYear.mockResolvedValue(undefined);
      repository.approveCalendar.mockResolvedValue({
        id: 'cal-draft',
        approved_at: '2025-05-01T00:00:00.000Z',
      });
      await expect(service.approveCalendar('school-1', 'identity-1')).resolves.toEqual({
        schoolCalendarId: 'cal-draft',
        approvalStatus: 'approved',
        approvedAt: '2025-05-01T00:00:00.000Z',
      });
      expect(repository.supersedeApprovedForSchoolYear).toHaveBeenCalledWith(
        'school-1',
        '2082/83',
      );
      expect(repository.approveCalendar).toHaveBeenCalledWith('cal-draft', 'identity-1');
    });

    it('rejects when no draft', async () => {
      repository.findDraftCalendar.mockResolvedValue(null);
      await expect(
        service.approveCalendar('school-1', 'identity-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getTeachingDays', () => {
    it('aggregates per-terminal counts for approved calendar only', async () => {
      repository.findApprovedCalendar.mockResolvedValue({ id: 'cal-1' });
      repository.listTerminals.mockResolvedValue([
        { id: 't1', name: 'Terminal 1' },
        { id: 't2', name: 'Terminal 2' },
      ]);
      repository.listTeachingDays.mockResolvedValue([
        { terminal_id: 't1', school_calendar_id: 'cal-1' },
        { terminal_id: 't1', school_calendar_id: 'cal-1' },
        { terminal_id: 't2', school_calendar_id: 'cal-1' },
        { terminal_id: 't-old', school_calendar_id: 'cal-old' },
      ]);
      await expect(service.getTeachingDays('school-1')).resolves.toEqual({
        schoolId: 'school-1',
        terminals: [
          { terminalId: 't1', terminalName: 'Terminal 1', teachingDayCount: 2 },
          { terminalId: 't2', terminalName: 'Terminal 2', teachingDayCount: 1 },
        ],
      });
    });

    it('rejects when no approved calendar', async () => {
      repository.findApprovedCalendar.mockResolvedValue(null);
      await expect(service.getTeachingDays('school-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getCalendarView', () => {
    it('returns none when no approved or draft calendar', async () => {
      repository.findApprovedCalendar.mockResolvedValue(null);
      repository.findDraftCalendar.mockResolvedValue(null);
      await expect(service.getCalendarView('school-1')).resolves.toEqual({
        schoolId: 'school-1',
        approvalStatus: 'none',
        nationalClosures: [],
        closures: [],
        terminals: [],
      });
    });

    it('prefers approved over draft and includes national + local closures', async () => {
      repository.findApprovedCalendar.mockResolvedValue({
        id: 'cal-approved',
        academic_year_label: '2082/83',
        approval_status: 'approved',
        session_start: '2025-04-14',
        session_end: '2026-04-13',
        weekly_offs: [6, 7],
      });
      repository.listSchoolClosures.mockResolvedValue([
        {
          id: 'loc-1',
          name: 'Sports day',
          start_date: '2025-06-01',
          end_date: '2025-06-01',
          source: 'local',
          category: 'eca',
          school_activity_id: null,
        },
      ]);
      repository.listTerminals.mockResolvedValue([
        {
          id: 't1',
          name: 'Terminal 1',
          start_date: '2025-04-14',
          end_date: '2025-08-31',
        },
      ]);
      const actual = await service.getCalendarView('school-1');
      expect(actual.approvalStatus).toBe('approved');
      expect(actual.schoolCalendarId).toBe('cal-approved');
      expect(actual.weeklyOffs).toEqual([6, 7]);
      expect(actual.nationalClosures[0]).toMatchObject({ name: 'Dashain', source: 'national' });
      expect(actual.closures[0]).toMatchObject({
        name: 'Sports day',
        source: 'local',
        category: 'eca',
      });
      expect(actual.terminals).toHaveLength(1);
      expect(repository.findDraftCalendar).not.toHaveBeenCalled();
    });

    it('falls back to draft when no approved calendar', async () => {
      repository.findApprovedCalendar.mockResolvedValue(null);
      repository.findDraftCalendar.mockResolvedValue({
        id: 'cal-draft',
        academic_year_label: '2082/83',
        approval_status: 'draft',
        session_start: '2025-04-14',
        session_end: '2026-04-13',
        weekly_offs: [6],
      });
      repository.listSchoolClosures.mockResolvedValue([]);
      repository.listTerminals.mockResolvedValue([]);
      const actual = await service.getCalendarView('school-1');
      expect(actual.approvalStatus).toBe('draft');
      expect(actual.schoolCalendarId).toBe('cal-draft');
      expect(actual.weeklyOffs).toEqual([6]);
    });
  });

  describe('getWeeklyOffPreset', () => {
    it('returns published national weekly offs when present', async () => {
      nationalCalendar.getPublishedWeeklyOffs.mockResolvedValue([6, 7]);
      const actual = await service.getWeeklyOffPreset(2082);
      expect(actual).toEqual({
        bsYear: 2082,
        weeklyOffs: [6, 7],
        fromNational: true,
      });
      expect(nationalCalendar.getPublishedWeeklyOffs).toHaveBeenCalledWith(2082);
    });

    it('falls back to Saturday when no published national calendar', async () => {
      nationalCalendar.getPublishedWeeklyOffs.mockResolvedValue(null);
      const actual = await service.getWeeklyOffPreset(2083);
      expect(actual).toEqual({
        bsYear: 2083,
        weeklyOffs: [6],
        fromNational: false,
      });
    });
  });
});
