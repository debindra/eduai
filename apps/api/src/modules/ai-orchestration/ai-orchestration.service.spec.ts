import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiOrchestrationService } from './ai-orchestration.service';
import type { AiOrchestrationRepository } from './ai-orchestration.repository';
import type { AiProviderPort } from '../../shared/ports/ai-provider.port';

describe('AiOrchestrationService', () => {
  let service: AiOrchestrationService;
  let repository: { findPrompt: ReturnType<typeof vi.fn> };
  let aiProvider: { complete: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repository = { findPrompt: vi.fn() };
    aiProvider = { complete: vi.fn() };
    service = new AiOrchestrationService(
      repository as unknown as AiOrchestrationRepository,
      aiProvider as unknown as AiProviderPort,
    );
  });

  it('throws when prompt row is missing', async () => {
    repository.findPrompt.mockResolvedValue(null);
    await expect(
      service.orchestrate({
        featureId: 'outcome_mapper',
        bandId: 'band-1',
        variables: {},
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(aiProvider.complete).not.toHaveBeenCalled();
  });

  it('routes haiku tier and renders template vars', async () => {
    repository.findPrompt.mockResolvedValue({
      id: 'p1',
      feature_id: 'outcome_mapper',
      band_id: 'band-1',
      model_tier: 'haiku',
      system_template: 'Obs: {{observation_text}}',
      validator_keys: [],
    });
    aiProvider.complete.mockResolvedValue({
      text: '{"ok":true}',
      modelTier: 'haiku',
    });

    const result = await service.orchestrate({
      featureId: 'outcome_mapper',
      bandId: 'band-1',
      variables: { observation_text: 'counted blocks' },
    });

    expect(result.modelTier).toBe('haiku');
    expect(aiProvider.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        modelTier: 'haiku',
        system: 'Obs: counted blocks',
      }),
    );
  });

  it('skips provider when model_tier is none', async () => {
    repository.findPrompt.mockResolvedValue({
      id: 'p1',
      feature_id: 'noop',
      band_id: 'band-1',
      model_tier: 'none',
      system_template: 'x',
      validator_keys: [],
    });
    const result = await service.orchestrate({
      featureId: 'noop',
      bandId: 'band-1',
      variables: {},
    });
    expect(result.text).toBe('');
    expect(aiProvider.complete).not.toHaveBeenCalled();
  });
});
