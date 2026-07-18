import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NEUTRAL_PARENT_REPORT_FALLBACK } from '@eduai/ai';
import { ReportsRepository, ReportsService } from './reports.service';
import type { AiOrchestrationService } from '../ai-orchestration/ai-orchestration.service';
import type { OutcomesRepository } from '../outcomes/outcomes.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let repository: {
    insertDraft: ReturnType<typeof vi.fn>;
    findDraft: ReturnType<typeof vi.fn>;
    approve: ReturnType<typeof vi.fn>;
  };
  let outcomesRepo: { listConfirmedForPeriod: ReturnType<typeof vi.fn> };
  let ai: { orchestrate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repository = {
      insertDraft: vi.fn(),
      findDraft: vi.fn(),
      approve: vi.fn(),
    };
    outcomesRepo = { listConfirmedForPeriod: vi.fn() };
    ai = { orchestrate: vi.fn() };
    service = new ReportsService(
      repository as unknown as ReportsRepository,
      outcomesRepo as unknown as OutcomesRepository,
      ai as unknown as AiOrchestrationService,
    );
  });

  it('uses neutral fallback for thin data without AI', async () => {
    outcomesRepo.listConfirmedForPeriod.mockResolvedValue([]);
    repository.insertDraft.mockResolvedValue({
      id: 'r1',
      child_id: 'c1',
      section_id: 's1',
      state: 'draft',
      body_text: NEUTRAL_PARENT_REPORT_FALLBACK,
      thin_data: true,
      evidence_snapshot: [],
      period_start: '2025-04-01',
      period_end: '2025-04-30',
    });

    const result = await service.draftMonthly({
      sectionId: 's1',
      childId: 'c1',
      bandId: 'b1',
      periodStart: '2025-04-01',
      periodEnd: '2025-04-30',
      teacherId: 't1',
    });

    expect(result.thinData).toBe(true);
    expect(result.bodyText).toBe(NEUTRAL_PARENT_REPORT_FALLBACK);
    expect(ai.orchestrate).not.toHaveBeenCalled();
  });

  it('approve never calls AI', async () => {
    repository.findDraft.mockResolvedValue({ id: 'r1', state: 'draft' });
    repository.approve.mockResolvedValue({
      id: 'r1',
      child_id: 'c1',
      section_id: 's1',
      state: 'approved',
      body_text: 'ok',
      thin_data: false,
      evidence_snapshot: [],
      period_start: '2025-04-01',
      period_end: '2025-04-30',
    });
    await service.approve('r1', 't1');
    expect(ai.orchestrate).not.toHaveBeenCalled();
  });
});
