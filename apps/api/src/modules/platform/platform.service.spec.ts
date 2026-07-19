import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseService } from '../../database/supabase.service';
import { PlatformService } from './platform.service';

/** Fluent thenable builder for `await client.from(...).select()...` chains. */
function createThenableResult<T>(result: T) {
  const builder = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
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

  beforeEach(() => {
    from = vi.fn();
    service = new PlatformService({
      getClient: () => ({ from }),
    } as unknown as SupabaseService);
  });

  describe('listSchools', () => {
    it('returns gravity-safe counts (sectionsBehind when no approved calendar)', async () => {
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
          return createThenableResult({ count: 3, error: null });
        }
        if (table === 'school_calendars') {
          return createThenableResult({
            data: [{ id: 'cal-1', approval_status: 'draft' }],
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
        sectionsTotal: 3,
        sectionsBehind: 3,
      });
      for (const key of FORBIDDEN_GRAVITY_KEYS) {
        expect(actual.schools[0]).not.toHaveProperty(key);
      }
    });

    it('sets sectionsBehind to 0 when an approved calendar exists', async () => {
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
          return createThenableResult({ count: 5, error: null });
        }
        if (table === 'school_calendars') {
          return createThenableResult({
            data: [{ id: 'cal-1', approval_status: 'approved' }],
            error: null,
          });
        }
        return createThenableResult({ data: null, error: null });
      });

      const actual = await service.listSchools();
      expect(actual.schools[0]?.sectionsBehind).toBe(0);
      expect(actual.schools[0]?.sectionsTotal).toBe(5);
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
    service = new PlatformService({
      getClient: () => null,
    } as unknown as SupabaseService);
    await expect(service.listSchools()).rejects.toBeInstanceOf(BadRequestException);
  });
});
