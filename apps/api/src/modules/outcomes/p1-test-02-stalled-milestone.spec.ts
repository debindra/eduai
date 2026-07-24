import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OutcomesRepository, OutcomesService } from './outcomes.service';
import type { AiOrchestrationService } from '../ai-orchestration/ai-orchestration.service';

/**
 * P1-TEST-02 — Stalled milestone → inclusive-assistant private prompt (not admin flag).
 */
describe('P1-TEST-02 stalled milestone private prompt', () => {
  let service: OutcomesService;
  let repository: {
    listStalled: ReturnType<typeof vi.fn>;
    insertProposed: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    confirm: ReturnType<typeof vi.fn>;
    listChildren: ReturnType<typeof vi.fn>;
    listProposed: ReturnType<typeof vi.fn>;
    listConfirmedForPeriod: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      listStalled: vi.fn(),
      insertProposed: vi.fn(),
      findById: vi.fn(),
      confirm: vi.fn(),
      listChildren: vi.fn(),
      listProposed: vi.fn(),
      listConfirmedForPeriod: vi.fn(),
    };
    service = new OutcomesService(
      repository as unknown as OutcomesRepository,
      { orchestrate: vi.fn() } as unknown as AiOrchestrationService,
    );
  });

  it('returns private prompt with count only — no child names for admin gravity', async () => {
    repository.listStalled.mockResolvedValue([
      { id: 'o1', child_id: 'c1', outcome_id: 'out1', updated_at: '2025-01-01', rating_code: 'not_yet' },
    ]);

    const result = await service.listStalledMilestones('sec-1', 3);

    expect(result.stalledCount).toBe(1);
    expect(result.privatePrompt).toMatch(/Inclusive assistant/i);
    expect(result).not.toHaveProperty('childNames');
    expect(JSON.stringify(result)).not.toMatch(/c1/);
  });
});
