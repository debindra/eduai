import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminRepository, AdminService } from './admin.service';
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

  beforeEach(() => {
    repository = {
      listSections: vi.fn().mockResolvedValue([{ id: 's1' }, { id: 's2' }]),
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
    service = new AdminService(
      repository as unknown as AdminRepository,
      pacing as unknown as PacingService,
      outcomes as unknown as OutcomesService,
    );
  });

  it('returns counts/shapes only — no child names or per-teacher rows', async () => {
    const result = await service.getDashboard('school-1', '2025-04-01', '2025-04-30');
    expect(result.sectionsBehindCount).toBe(1);
    expect(result.sectionsTotal).toBe(2);
    expect(result.coverageBySection).toEqual([
      { sectionId: 's1', childrenWithFreshOutcomes: 3 },
      { sectionId: 's2', childrenWithFreshOutcomes: 3 },
    ]);
    expect(result.needsSupportBySection.every((r) => 'stalledCount' in r)).toBe(true);
    const json = JSON.stringify(result);
    expect(json).not.toMatch(/childNames|bandDistribution|ratingDistribution|teacherId/i);
    expect(Object.keys(result)).not.toContain('childNames');
    expect(Object.keys(result)).not.toContain('teacherLeague');
  });
});
