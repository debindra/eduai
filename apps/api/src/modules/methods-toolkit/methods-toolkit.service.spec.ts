import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiOrchestrationService } from '../ai-orchestration/ai-orchestration.service';
import {
  METHODS_TOOLKIT_MENU,
  MethodsToolkitRepository,
  MethodsToolkitService,
} from './methods-toolkit.service';

describe('MethodsToolkitService', () => {
  let service: MethodsToolkitService;
  let repository: {
    findOutcome: ReturnType<typeof vi.fn>;
    findChild: ReturnType<typeof vi.fn>;
  };
  let ai: { orchestrate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repository = {
      findOutcome: vi.fn(),
      findChild: vi.fn(),
    };
    ai = { orchestrate: vi.fn() };
    service = new MethodsToolkitService(
      repository as unknown as MethodsToolkitRepository,
      ai as unknown as AiOrchestrationService,
    );
  });

  it('exposes config-driven menu (no grade branches)', () => {
    const menu = service.getMenu();
    expect(menu.items.length).toBe(METHODS_TOOLKIT_MENU.length);
    expect(menu.items.map((i) => i.id)).toContain('reteach_small_group');
  });

  it('generates with identical prompt path regardless of school tier (parity)', async () => {
    repository.findOutcome.mockResolvedValue({
      id: 'out-1',
      statement_en: 'Counts to 20',
      band_id: 'band-be',
    });
    repository.findChild.mockResolvedValue({ id: 'c1', name: 'Nisha Rai' });
    ai.orchestrate.mockResolvedValue({
      text: 'Use counters for 10 minutes.',
      modelTier: 'haiku',
      validatorKeys: [],
    });

    const free = await service.generate({
      bandId: 'band-be',
      outcomeId: 'out-1',
      childId: 'c1',
      activityType: 'peer_practice',
      schoolTier: 'free',
    });
    const pro = await service.generate({
      bandId: 'band-be',
      outcomeId: 'out-1',
      childId: 'c1',
      activityType: 'peer_practice',
      schoolTier: 'pro',
    });

    expect(free.generationParity).toBe(true);
    expect(pro.generationParity).toBe(true);
    expect(free.modelTier).toBe(pro.modelTier);
    expect(ai.orchestrate).toHaveBeenCalledTimes(2);
    const calls = ai.orchestrate.mock.calls;
    expect(calls[0][0].featureId).toBe(calls[1][0].featureId);
    expect(calls[0][0].bandId).toBe(calls[1][0].bandId);
    expect(calls[0][0].variables.activity_type).toBe(calls[1][0].variables.activity_type);
  });
});
