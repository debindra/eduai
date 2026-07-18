import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CertificationRepository, CertificationService } from './certification.service';
import type { WeekProgress } from './certification-logic';

describe('CertificationService', () => {
  let service: CertificationService;
  let repository: {
    listWeeks: ReturnType<typeof vi.fn>;
    upsertWeek: ReturnType<typeof vi.fn>;
    getObservation: ReturnType<typeof vi.fn>;
    upsertObservation: ReturnType<typeof vi.fn>;
    updateTeacherStatus: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      listWeeks: vi.fn().mockResolvedValue([] as WeekProgress[]),
      upsertWeek: vi.fn().mockResolvedValue(undefined),
      getObservation: vi.fn().mockResolvedValue(null),
      upsertObservation: vi.fn().mockResolvedValue(undefined),
      updateTeacherStatus: vi.fn().mockResolvedValue(undefined),
    };
    service = new CertificationService(repository as unknown as CertificationRepository);
  });

  it('passes a weekly quiz above threshold and updates derived status', async () => {
    // listWeeks reflects the persisted week when getProgress re-reads after the write.
    repository.listWeeks.mockResolvedValue([{ week: 4, status: 'quiz_passed', quizScore: 0.8 }]);
    const result = await service.submitWeeklyQuiz('t1', 4, 8, 10);
    expect(repository.upsertWeek).toHaveBeenCalledWith('t1', 4, 'quiz_passed', 0.8);
    expect(repository.updateTeacherStatus).toHaveBeenCalledWith('t1', 'in_programme');
    expect(result.status).toBe('in_programme');
  });

  it('fails a weekly quiz below threshold', async () => {
    await service.submitWeeklyQuiz('t1', 2, 3, 10);
    expect(repository.upsertWeek).toHaveBeenCalledWith('t1', 2, 'quiz_failed', 0.3);
  });

  it('rejects an out-of-range week', async () => {
    await expect(service.submitWeeklyQuiz('t1', 13, 5, 10)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repository.upsertWeek).not.toHaveBeenCalled();
  });

  it('certifies when all 12 weeks pass and observation passes', async () => {
    repository.listWeeks.mockResolvedValue(
      Array.from({ length: 12 }, (_, i) => ({
        week: i + 1,
        status: 'quiz_passed' as const,
        quizScore: 0.9,
      })),
    );
    repository.getObservation.mockResolvedValue({ status: 'passed', score: 0.95 });

    const result = await service.scoreObservation('t1', true, 0.95, 'assessor-1');

    expect(repository.upsertObservation).toHaveBeenCalledWith('t1', {
      status: 'passed',
      score: 0.95,
      scored_by: 'assessor-1',
      scored_at: expect.any(String),
    });
    expect(result.status).toBe('certified');
    expect(repository.updateTeacherStatus).toHaveBeenCalledWith('t1', 'certified');
  });

  it('returns a full 12-week view from getProgress', async () => {
    repository.listWeeks.mockResolvedValue([
      { week: 1, status: 'quiz_passed', quizScore: 0.9 },
    ]);
    const view = await service.getProgress('t1');
    expect(view.weeks).toHaveLength(12);
    expect(view.observation.status).toBe('pending');
  });
});
