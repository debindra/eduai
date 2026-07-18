import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { CoachRepository, CoachService } from './coach.service';
import type { AiOrchestrationService } from '../ai-orchestration/ai-orchestration.service';

describe('CoachService', () => {
  let service: CoachService;
  let repository: { insertMessage: ReturnType<typeof vi.fn> };
  let ai: { orchestrate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repository = { insertMessage: vi.fn().mockResolvedValue({}) };
    ai = { orchestrate: vi.fn() };
    service = new CoachService(
      repository as unknown as CoachRepository,
      ai as unknown as AiOrchestrationService,
    );
  });

  it('rejects child_id', async () => {
    await expect(
      service.chat({
        teacherId: 't1',
        schoolId: 's1',
        bandId: 'b1',
        message: 'help',
        childId: 'c1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(ai.orchestrate).not.toHaveBeenCalled();
  });

  it('short-circuits safeguarding without coaching AI', async () => {
    const result = await service.chat({
      teacherId: 't1',
      schoolId: 's1',
      bandId: 'b1',
      message: 'possible harm to a child',
    });
    expect(result.safeguarding).toBe(true);
    expect(ai.orchestrate).not.toHaveBeenCalled();
  });
});
