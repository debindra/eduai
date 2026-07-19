import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseService } from '../../database/supabase.service';
import type { AuthService } from '../auth/auth.service';
import type { CalendarService } from '../calendar/calendar.service';
import type { AuditService } from './audit.service';
import { PlatformService } from './platform.service';

/** Fluent thenable builder for `await client.from(...).select()...` chains. */
function createThenableResult<T>(result: T) {
  const builder = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    delete: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    not: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
    then: undefined as unknown,
  };
  builder.then = (
    resolve: (value: T) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

const FORBIDDEN_GRAVITY_KEYS = [
  'ratings',
  'bandDistributions',
  'childNames',
  'ratingDistribution',
  'bandDistribution',
  'studentNames',
  'outcomeRatings',
];

describe('PlatformService', () => {
  let service: PlatformService;
  let from: ReturnType<typeof vi.fn>;
  let authService: { invite: ReturnType<typeof vi.fn> };
  let audit: { append: ReturnType<typeof vi.fn> };
  let calendarService: {
    setupCalendar: ReturnType<typeof vi.fn>;
    getFestivalTemplate: ReturnType<typeof vi.fn>;
    patchFestivalTemplate: ReturnType<typeof vi.fn>;
    approveCalendar: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    from = vi.fn();
    authService = { invite: vi.fn() };
    audit = { append: vi.fn().mockResolvedValue(undefined) };
    calendarService = {
      setupCalendar: vi.fn(),
      getFestivalTemplate: vi.fn(),
      patchFestivalTemplate: vi.fn(),
      approveCalendar: vi.fn(),
    };
    service = new PlatformService(
      { getClient: () => ({ from }) } as unknown as SupabaseService,
      authService as unknown as AuthService,
      audit as unknown as AuditService,
      calendarService as unknown as CalendarService,
    );
  });

  describe('listSchools', () => {
    it('returns gravity-safe counts including calendar and roster aggregates', async () => {
      from.mockImplementation((table: string) => {
        if (table === 'schools') {
          return createThenableResult({
            data: [
              {
                id: 'school-1',
                name: 'School One',
                region: 'Bagmati',
                tier: 'pro',
                licensed_band_range: 'Nursery–5',
                exit_status: null,
              },
            ],
            error: null,
          });
        }
        if (table === 'sections') {
          return createThenableResult({
            data: [
              { id: 'sec-1', school_id: 'school-1' },
              { id: 'sec-2', school_id: 'school-1' },
              { id: 'sec-3', school_id: 'school-1' },
            ],
            error: null,
          });
        }
        if (table === 'school_calendars') {
          return createThenableResult({
            data: [{ school_id: 'school-1', approval_status: 'draft' }],
            error: null,
          });
        }
        if (table === 'school_memberships') {
          return createThenableResult({
            data: [
              { school_id: 'school-1', member_type: 'teacher' },
              { school_id: 'school-1', member_type: 'teacher' },
            ],
            error: null,
          });
        }
        if (table === 'children') {
          return createThenableResult({
            data: [
              { id: 'c1', section_id: 'sec-1' },
              { id: 'c2', section_id: 'sec-1' },
              { id: 'c3', section_id: 'sec-2' },
            ],
            error: null,
          });
        }
        if (table === 'teacher_sections') {
          return createThenableResult({
            data: [
              { section_id: 'sec-1', subject_id: 'subj-math' },
              { section_id: 'sec-2', subject_id: 'subj-math' },
              { section_id: 'sec-2', subject_id: 'subj-eng' },
            ],
            error: null,
          });
        }
        return createThenableResult({ data: null, error: null });
      });

      const actual = await service.listSchools();
      expect(actual.schools).toHaveLength(1);
      expect(actual.schools[0]).toEqual({
        id: 'school-1',
        name: 'School One',
        region: 'Bagmati',
        tier: 'pro',
        licensedBandRange: 'Nursery–5',
        exitStatus: null,
        calendarStatus: 'draft',
        sectionsTotal: 3,
        sectionsBehind: 3,
        teachersTotal: 2,
        studentsTotal: 3,
        subjectsTotal: 2,
      });
      for (const key of FORBIDDEN_GRAVITY_KEYS) {
        expect(actual.schools[0]).not.toHaveProperty(key);
      }
    });

    it('sets sectionsBehind to 0 and calendarStatus approved when calendar approved', async () => {
      from.mockImplementation((table: string) => {
        if (table === 'schools') {
          return createThenableResult({
            data: [
              {
                id: 'school-1',
                name: 'School One',
                region: null,
                tier: null,
                licensed_band_range: null,
                exit_status: null,
              },
            ],
            error: null,
          });
        }
        if (table === 'sections') {
          return createThenableResult({
            data: Array.from({ length: 5 }, (_, i) => ({
              id: `sec-${i}`,
              school_id: 'school-1',
            })),
            error: null,
          });
        }
        if (table === 'school_calendars') {
          return createThenableResult({
            data: [{ school_id: 'school-1', approval_status: 'approved' }],
            error: null,
          });
        }
        if (table === 'school_memberships') {
          return createThenableResult({ data: [], error: null });
        }
        if (table === 'children') {
          return createThenableResult({ data: [], error: null });
        }
        if (table === 'teacher_sections') {
          return createThenableResult({ data: [], error: null });
        }
        return createThenableResult({ data: null, error: null });
      });

      const actual = await service.listSchools();
      expect(actual.schools[0]?.sectionsBehind).toBe(0);
      expect(actual.schools[0]?.sectionsTotal).toBe(5);
      expect(actual.schools[0]?.calendarStatus).toBe('approved');
      expect(actual.schools[0]?.teachersTotal).toBe(0);
      expect(actual.schools[0]?.studentsTotal).toBe(0);
      expect(actual.schools[0]?.subjectsTotal).toBe(0);
    });
  });

  describe('createSchool', () => {
    it('rejects when neither adminEmail nor adminPhone is provided', async () => {
      await expect(
        service.createSchool('identity-pa', { name: 'New School' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(authService.invite).not.toHaveBeenCalled();
    });

    it('rejects when both adminEmail and adminPhone are provided', async () => {
      await expect(
        service.createSchool('identity-pa', {
          name: 'New School',
          adminEmail: 'admin@school.dev',
          adminPhone: '9800000000',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(authService.invite).not.toHaveBeenCalled();
    });

    it('rejects whitespace-only school name', async () => {
      await expect(
        service.createSchool('identity-pa', {
          name: '   ',
          adminEmail: 'admin@school.dev',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(authService.invite).not.toHaveBeenCalled();
    });

    it('rejects whitespace-only adminPhone as missing contact', async () => {
      await expect(
        service.createSchool('identity-pa', {
          name: 'New School',
          adminPhone: '   ',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(authService.invite).not.toHaveBeenCalled();
    });

    it('inserts school, invites first admin, and audits', async () => {
      from.mockImplementation((table: string) => {
        if (table === 'schools') {
          return createThenableResult({
            data: {
              id: 'school-new',
              name: 'New School',
              region: 'Pokhara',
              tier: 'pilot',
              licensed_band_range: 'pre_primary',
              exit_status: null,
            },
            error: null,
          });
        }
        return createThenableResult({ data: null, error: null });
      });
      authService.invite.mockResolvedValue({
        identityId: 'id-admin',
        delivery: 'email',
      });

      const actual = await service.createSchool('identity-pa', {
        name: 'New School',
        region: 'Pokhara',
        tier: 'pilot',
        licensedBandRange: 'pre_primary',
        adminEmail: 'admin@school.dev',
        adminDisplayName: 'First Admin',
      });

      expect(authService.invite).toHaveBeenCalledWith({
        schoolId: 'school-new',
        memberType: 'admin',
        email: 'admin@school.dev',
        phone: undefined,
        displayName: 'First Admin',
      });
      expect(audit.append).toHaveBeenCalledWith({
        actorIdentityId: 'identity-pa',
        action: 'platform.school.created',
        scope: {
          schoolId: 'school-new',
          adminIdentityId: 'id-admin',
          delivery: 'email',
        },
      });
      expect(actual).toEqual({
        school: {
          id: 'school-new',
          name: 'New School',
          region: 'Pokhara',
          tier: 'pilot',
          licensedBandRange: 'pre_primary',
          exitStatus: null,
          calendarStatus: 'none',
          sectionsTotal: 0,
          sectionsBehind: 0,
          teachersTotal: 0,
          studentsTotal: 0,
          subjectsTotal: 0,
        },
        admin: { identityId: 'id-admin', delivery: 'email' },
      });
    });

    it('still returns success when audit append fails after invite', async () => {
      from.mockImplementation((table: string) => {
        if (table === 'schools') {
          return createThenableResult({
            data: {
              id: 'school-new',
              name: 'New School',
              region: null,
              tier: null,
              licensed_band_range: null,
              exit_status: null,
            },
            error: null,
          });
        }
        return createThenableResult({ data: null, error: null });
      });
      authService.invite.mockResolvedValue({
        identityId: 'id-admin',
        delivery: 'email',
      });
      audit.append.mockRejectedValue(new Error('audit down'));

      const actual = await service.createSchool('identity-pa', {
        name: 'New School',
        adminEmail: 'admin@school.dev',
      });

      expect(actual.school.id).toBe('school-new');
      expect(actual.admin.identityId).toBe('id-admin');
    });

    it('rolls back school insert when invite fails', async () => {
      const deleteEq = vi.fn(() => Promise.resolve({ error: null }));
      const deleteFn = vi.fn(() => ({ eq: deleteEq }));
      from.mockImplementation((table: string) => {
        if (table === 'schools') {
          const builder = createThenableResult({
            data: {
              id: 'school-new',
              name: 'New School',
              region: null,
              tier: null,
              licensed_band_range: null,
              exit_status: null,
            },
            error: null,
          });
          builder.delete = deleteFn as unknown as typeof builder.delete;
          return builder;
        }
        return createThenableResult({ data: null, error: null });
      });
      authService.invite.mockRejectedValue(new BadRequestException('invite failed'));

      await expect(
        service.createSchool('identity-pa', {
          name: 'New School',
          adminPhone: '9801112222',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(deleteFn).toHaveBeenCalled();
      expect(deleteEq).toHaveBeenCalledWith('id', 'school-new');
      expect(audit.append).not.toHaveBeenCalled();
    });

    it('surfaces orphan schoolId when invite and rollback both fail', async () => {
      const deleteEq = vi.fn(() =>
        Promise.resolve({ error: { message: 'fk constraint' } }),
      );
      const deleteFn = vi.fn(() => ({ eq: deleteEq }));
      from.mockImplementation((table: string) => {
        if (table === 'schools') {
          const builder = createThenableResult({
            data: {
              id: 'school-orphan',
              name: 'New School',
              region: null,
              tier: null,
              licensed_band_range: null,
              exit_status: null,
            },
            error: null,
          });
          builder.delete = deleteFn as unknown as typeof builder.delete;
          return builder;
        }
        return createThenableResult({ data: null, error: null });
      });
      authService.invite.mockRejectedValue(new BadRequestException('invite failed'));

      await expect(
        service.createSchool('identity-pa', {
          name: 'New School',
          adminEmail: 'admin@school.dev',
        }),
      ).rejects.toThrow(/Orphan schoolId=school-orphan/);
    });
  });

  describe('setupSchoolCalendar', () => {
    const setupDto = {
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

    it('rejects when school does not exist', async () => {
      from.mockImplementation(() =>
        createThenableResult({ data: null, error: null }),
      );
      await expect(
        service.setupSchoolCalendar('identity-pa', 'missing', setupDto),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(calendarService.setupCalendar).not.toHaveBeenCalled();
    });

    it('delegates to CalendarService and audits', async () => {
      from.mockImplementation((table: string) => {
        if (table === 'schools') {
          return createThenableResult({
            data: { id: 'school-1', name: 'School One' },
            error: null,
          });
        }
        return createThenableResult({ data: null, error: null });
      });
      calendarService.setupCalendar.mockResolvedValue({
        schoolCalendarId: 'cal-1',
        academicYearLabel: '2082/83',
        approvalStatus: 'draft',
      });

      const actual = await service.setupSchoolCalendar(
        'identity-pa',
        'school-1',
        setupDto,
      );

      expect(calendarService.setupCalendar).toHaveBeenCalledWith('school-1', setupDto);
      expect(audit.append).toHaveBeenCalledWith({
        actorIdentityId: 'identity-pa',
        action: 'platform.school.calendar_setup',
        scope: {
          schoolId: 'school-1',
          schoolCalendarId: 'cal-1',
          academicYearLabel: '2082/83',
        },
      });
      expect(actual.schoolCalendarId).toBe('cal-1');
    });
  });

  describe('patchSchoolCalendarClosures', () => {
    it('delegates to CalendarService.patchFestivalTemplate and audits', async () => {
      from.mockImplementation((table: string) => {
        if (table === 'schools') {
          return createThenableResult({
            data: { id: 'school-1', name: 'School One' },
            error: null,
          });
        }
        return createThenableResult({ data: null, error: null });
      });
      calendarService.patchFestivalTemplate.mockResolvedValue({
        schoolCalendarId: 'cal-1',
        bsYear: 2082,
        nationalClosures: [],
        closures: [
          {
            id: 'c1',
            name: 'Sports day',
            startDate: '2025-05-01',
            endDate: '2025-05-01',
            category: 'eca',
            source: 'manual',
            readOnly: false,
          },
        ],
      });

      const actual = await service.patchSchoolCalendarClosures('identity-pa', 'school-1', {
        closures: [
          {
            name: 'Sports day',
            startDate: '2025-05-01',
            endDate: '2025-05-01',
            category: 'eca',
          },
        ],
      });

      expect(calendarService.patchFestivalTemplate).toHaveBeenCalled();
      expect(audit.append).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'platform.school.calendar_closures' }),
      );
      expect(actual.closures).toHaveLength(1);
    });
  });

  describe('approveSchoolCalendar', () => {
    it('delegates to CalendarService.approveCalendar and audits', async () => {
      from.mockImplementation((table: string) => {
        if (table === 'schools') {
          return createThenableResult({
            data: { id: 'school-1', name: 'School One' },
            error: null,
          });
        }
        return createThenableResult({ data: null, error: null });
      });
      calendarService.approveCalendar.mockResolvedValue({
        schoolCalendarId: 'cal-1',
        approvalStatus: 'approved',
        approvedAt: '2025-07-01T00:00:00.000Z',
      });

      const actual = await service.approveSchoolCalendar('identity-pa', 'school-1');

      expect(calendarService.approveCalendar).toHaveBeenCalledWith(
        'school-1',
        'identity-pa',
      );
      expect(actual.approvalStatus).toBe('approved');
    });
  });

  describe('createSupportSession', () => {
    it('rejects when school does not exist', async () => {
      from.mockImplementation(() =>
        createThenableResult({ data: null, error: null }),
      );
      await expect(
        service.createSupportSession('pa-1', {
          schoolId: 'missing',
          reason: 'Support ticket',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('creates an active session with school name', async () => {
      from.mockImplementation((table: string) => {
        if (table === 'schools') {
          return createThenableResult({
            data: { id: 'school-1', name: 'School One' },
            error: null,
          });
        }
        if (table === 'support_sessions') {
          return createThenableResult({
            data: {
              id: 'sess-1',
              school_id: 'school-1',
              reason: 'Parent complaint',
              granted_by: 'Principal',
              starts_at: '2025-07-01T00:00:00.000Z',
              expires_at: '2025-07-01T04:00:00.000Z',
              status: 'active',
            },
            error: null,
          });
        }
        return createThenableResult({ data: null, error: null });
      });

      const actual = await service.createSupportSession('pa-1', {
        schoolId: 'school-1',
        reason: 'Parent complaint',
        grantedBy: 'Principal',
        expiresInHours: 4,
      });
      expect(actual).toMatchObject({
        id: 'sess-1',
        schoolId: 'school-1',
        schoolName: 'School One',
        reason: 'Parent complaint',
        grantedBy: 'Principal',
        status: 'active',
      });
    });
  });

  describe('listSupportSessions', () => {
    it('marks past-expiry active sessions as expired on read', async () => {
      const updateEqStatus = vi.fn(() => Promise.resolve({ error: null }));
      const updateEqId = vi.fn(() => ({ eq: updateEqStatus }));
      const update = vi.fn(() => ({ eq: updateEqId }));

      from.mockImplementation((table: string) => {
        if (table === 'support_sessions') {
          const builder = createThenableResult({
            data: [
              {
                id: 'sess-stale',
                school_id: 'school-1',
                reason: 'Old',
                granted_by: null,
                starts_at: '2020-01-01T00:00:00.000Z',
                expires_at: '2020-01-01T04:00:00.000Z',
                status: 'active',
              },
            ],
            error: null,
          });
          builder.update = update as unknown as typeof builder.update;
          return builder;
        }
        if (table === 'schools') {
          return createThenableResult({
            data: [{ id: 'school-1', name: 'School One' }],
            error: null,
          });
        }
        return createThenableResult({ data: null, error: null });
      });

      const actual = await service.listSupportSessions('pa-1');
      expect(actual.sessions[0]?.status).toBe('expired');
      expect(update).toHaveBeenCalledWith({ status: 'expired' });
    });
  });

  describe('revokeSupportSession', () => {
    it('rejects when session is missing or not revocable', async () => {
      from.mockImplementation(() =>
        createThenableResult({ data: null, error: null }),
      );
      await expect(
        service.revokeSupportSession('pa-1', 'sess-missing'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns revoked session with school name', async () => {
      from.mockImplementation((table: string) => {
        if (table === 'support_sessions') {
          return createThenableResult({
            data: {
              id: 'sess-1',
              school_id: 'school-1',
              reason: 'Ticket',
              granted_by: null,
              starts_at: '2025-07-01T00:00:00.000Z',
              expires_at: '2025-07-01T04:00:00.000Z',
              status: 'revoked',
            },
            error: null,
          });
        }
        if (table === 'schools') {
          return createThenableResult({
            data: { name: 'School One' },
            error: null,
          });
        }
        return createThenableResult({ data: null, error: null });
      });

      const actual = await service.revokeSupportSession('pa-1', 'sess-1');
      expect(actual.status).toBe('revoked');
      expect(actual.schoolName).toBe('School One');
    });
  });

  it('rejects when database is not configured', async () => {
    service = new PlatformService(
      { getClient: () => null } as unknown as SupabaseService,
      authService as unknown as AuthService,
      audit as unknown as AuditService,
      calendarService as unknown as CalendarService,
    );
    await expect(service.listSchools()).rejects.toBeInstanceOf(BadRequestException);
  });
});
