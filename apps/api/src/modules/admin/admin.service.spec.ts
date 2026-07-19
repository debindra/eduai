import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminRepository, AdminService, exclusivePeriodEnd } from './admin.service';
import type { SupabaseService } from '../../database/supabase.service';
import type { CacheMetricsService } from '../ai-orchestration/cache-metrics.service';
import type { OutOfSegmentService } from '../out-of-segment/out-of-segment.service';
import type { OutcomesService } from '../outcomes/outcomes.service';
import type { PacingService } from '../pacing/pacing.service';

describe('AdminService', () => {
  let service: AdminService;
  let repository: {
    listSections: ReturnType<typeof vi.fn>;
    countChildrenWithFreshOutcomes: ReturnType<typeof vi.fn>;
    communicationReplyRate: ReturnType<typeof vi.fn>;
  };
  let pacing: { getPacing: ReturnType<typeof vi.fn> };
  let outcomes: { listStalledMilestones: ReturnType<typeof vi.fn> };
  let cacheMetrics: { snapshot: ReturnType<typeof vi.fn> };
  let outOfSegment: { adminCounts: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repository = {
      listSections: vi
        .fn()
        .mockResolvedValue([
          { id: 's1', name: 'UKG A' },
          { id: 's2', name: 'Grade 1 A' },
        ]),
      countChildrenWithFreshOutcomes: vi.fn().mockResolvedValue(3),
      communicationReplyRate: vi.fn().mockResolvedValue(0.8),
    };
    pacing = {
      getPacing: vi
        .fn()
        .mockResolvedValueOnce({ state: 'behind' })
        .mockResolvedValueOnce({ state: 'on_track' }),
    };
    outcomes = {
      listStalledMilestones: vi.fn().mockResolvedValue({ stalledCount: 2 }),
    };
    cacheMetrics = { snapshot: vi.fn() };
    outOfSegment = { adminCounts: vi.fn() };
    service = new AdminService(
      repository as unknown as AdminRepository,
      pacing as unknown as PacingService,
      outcomes as unknown as OutcomesService,
      cacheMetrics as unknown as CacheMetricsService,
      outOfSegment as unknown as OutOfSegmentService,
    );
  });

  it('returns counts/shapes only — no child names or per-teacher rows', async () => {
    const result = await service.getDashboard('school-1', '2025-04-01', '2025-04-30');
    expect(result.sectionsBehindCount).toBe(1);
    expect(result.sectionsTotal).toBe(2);
    expect(result.coverageBySection).toEqual([
      { sectionId: 's1', sectionName: 'UKG A', childrenWithFreshOutcomes: 3 },
      { sectionId: 's2', sectionName: 'Grade 1 A', childrenWithFreshOutcomes: 3 },
    ]);
    expect(result.needsSupportBySection.every((r) => 'stalledCount' in r)).toBe(true);
    const json = JSON.stringify(result);
    expect(json).not.toMatch(/childNames|bandDistribution|ratingDistribution|teacherId/i);
    expect(Object.keys(result)).not.toContain('childNames');
    expect(Object.keys(result)).not.toContain('teacherLeague');
  });
});

describe('exclusivePeriodEnd', () => {
  it('advances a date-only period end by one day to an exclusive UTC bound', () => {
    expect(exclusivePeriodEnd('2025-04-30')).toBe('2025-05-01T00:00:00.000Z');
  });

  it('rolls month/year boundaries correctly', () => {
    expect(exclusivePeriodEnd('2025-12-31')).toBe('2026-01-01T00:00:00.000Z');
  });

  it('ignores any time component and uses the calendar day', () => {
    expect(exclusivePeriodEnd('2025-04-30T18:42:00.000Z')).toBe('2025-05-01T00:00:00.000Z');
  });
});

describe('AdminRepository.countChildrenWithFreshOutcomes', () => {
  function buildRepository(rows: Array<{ child_id: string }>) {
    const resolved = { data: rows, error: null };
    const gte = vi.fn().mockReturnThis();
    const lt = vi.fn().mockReturnThis();
    const lte = vi.fn().mockReturnThis();
    // Chainable query builder; awaiting it resolves to { data, error }.
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte,
      lt,
      lte,
      then: (resolve: (v: typeof resolved) => unknown) => resolve(resolved),
    };
    const client = { from: vi.fn().mockReturnValue(query) };
    const supabase = { getClient: vi.fn().mockReturnValue(client) };
    const repository = new AdminRepository(supabase as unknown as SupabaseService);
    return { repository, gte, lt, lte };
  }

  it('counts distinct children and includes outcomes confirmed on the last day', async () => {
    const { repository, gte, lt, lte } = buildRepository([
      { child_id: 'c1' },
      { child_id: 'c1' },
      { child_id: 'c2' },
    ]);
    const count = await repository.countChildrenWithFreshOutcomes(
      's1',
      '2025-04-01',
      '2025-04-30',
    );
    expect(count).toBe(2);
    expect(gte).toHaveBeenCalledWith('confirmed_at', '2025-04-01');
    expect(lt).toHaveBeenCalledWith('confirmed_at', '2025-05-01T00:00:00.000Z');
    expect(lte).not.toHaveBeenCalled();
  });
});
