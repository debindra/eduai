import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LessonRepository, LessonService } from './lesson.service';
import type { AiOrchestrationService } from '../ai-orchestration/ai-orchestration.service';
import type { PlanningCascadeService } from '../planning-cascade/planning-cascade.service';

describe('LessonService', () => {
  let service: LessonService;
  let repository: {
    getSlice: ReturnType<typeof vi.fn>;
    insertDraft: ReturnType<typeof vi.fn>;
    markDone: ReturnType<typeof vi.fn>;
  };
  let planning: { getDaily: ReturnType<typeof vi.fn> };
  let ai: { orchestrate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repository = {
      getSlice: vi.fn(),
      insertDraft: vi.fn(),
      markDone: vi.fn(),
    };
    planning = { getDaily: vi.fn() };
    ai = { orchestrate: vi.fn() };
    service = new LessonService(
      repository as unknown as LessonRepository,
      planning as unknown as PlanningCascadeService,
      ai as unknown as AiOrchestrationService,
    );
  });

  it('grounds generate in map_slice and selects pedagogy by rule', async () => {
    planning.getDaily.mockResolvedValue({
      mapSliceId: 'slice-1',
      teachingDayIndex: 3,
      themeOrChapter: 'Letters and sounds',
    });
    repository.getSlice.mockResolvedValue({
      theme_or_chapter: 'Letters and sounds',
    });
    ai.orchestrate.mockResolvedValue({ text: '{"objective":"letters"}' });
    repository.insertDraft.mockResolvedValue({
      id: 'd1',
      content: {},
    });

    const result = await service.generate('sec-1', 'band-1', '2025-04-15', 't1');
    expect(result.pedagogyType).toBe('explicit_instruction');
    expect(ai.orchestrate).toHaveBeenCalled();
  });

  it('markDone does not call AI', async () => {
    repository.markDone.mockResolvedValue({ id: 'lp1', status: 'done' });
    await service.markDone('sec-1', 'slice-1', 't1');
    expect(ai.orchestrate).not.toHaveBeenCalled();
  });
});
