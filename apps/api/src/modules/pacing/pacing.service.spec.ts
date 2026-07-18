import { beforeEach, describe, expect, it, vi } from 'vitest';
import { computePacingState, PacingRepository, PacingService } from './pacing.service';

describe('computePacingState', () => {
  it('returns on_track when gap is small', () => {
    expect(computePacingState({ plannedIndex: 10, actualDone: 9, previouslyBehind: false }).state).toBe(
      'on_track',
    );
  });

  it('returns behind when gap > 1', () => {
    expect(computePacingState({ plannedIndex: 10, actualDone: 5, previouslyBehind: false }).state).toBe(
      'behind',
    );
  });

  it('returns self_correcting after catch-up', () => {
    expect(
      computePacingState({ plannedIndex: 10, actualDone: 10, previouslyBehind: true }).state,
    ).toBe('self_correcting');
  });
});

describe('PacingService', () => {
  let service: PacingService;
  let repository: {
    findMap: ReturnType<typeof vi.fn>;
    countTeachingDaysElapsed: ReturnType<typeof vi.fn>;
    countDone: ReturnType<typeof vi.fn>;
    countSlices: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      findMap: vi.fn(),
      countTeachingDaysElapsed: vi.fn(),
      countDone: vi.fn(),
      countSlices: vi.fn(),
    };
    service = new PacingService(repository as unknown as PacingRepository);
  });

  it('never requires student_outcomes (coverage-only)', async () => {
    repository.findMap.mockResolvedValue({ id: 'm1', school_calendar_id: 'c1' });
    repository.countTeachingDaysElapsed.mockResolvedValue(12);
    repository.countDone.mockResolvedValue(8);
    repository.countSlices.mockResolvedValue(100);

    const result = await service.getPacing('sec-1', '2025-05-01');
    expect(result.state).toBe('behind');
    expect(result.gapTeachingDays).toBe(4);
    expect(Object.keys(repository)).not.toContain('countOutcomes');
  });
});
