import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiOrchestrationService } from './ai-orchestration.service';
import type { AiOrchestrationRepository } from './ai-orchestration.repository';
import type { AiProviderPort } from '../../shared/ports/ai-provider.port';
import type { CachePort } from '../../shared/ports/cache.port';
import type { OutOfSegmentService } from '../out-of-segment/out-of-segment.service';
import { InMemoryCacheAdapter } from './adapters/in-memory-cache.adapter';
import { CacheMetricsService } from './cache-metrics.service';

const METHODS_PROMPT = {
  id: 'p1',
  feature_id: 'methods_toolkit',
  band_id: 'band-1',
  model_tier: 'haiku' as const,
  system_template: 'Activity: {{activity_type}} for {{outcome_statement}}',
  validator_keys: [],
};

describe('AiOrchestrationService', () => {
  let service: AiOrchestrationService;
  let repository: { findPrompt: ReturnType<typeof vi.fn> };
  let aiProvider: { complete: ReturnType<typeof vi.fn> };
  let cache: CachePort;
  let metrics: CacheMetricsService;
  let outOfSegment: { logIfOutOfSegment: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repository = { findPrompt: vi.fn() };
    aiProvider = { complete: vi.fn() };
    cache = new InMemoryCacheAdapter();
    metrics = new CacheMetricsService();
    outOfSegment = { logIfOutOfSegment: vi.fn().mockResolvedValue(false) };
    service = new AiOrchestrationService(
      repository as unknown as AiOrchestrationRepository,
      aiProvider as unknown as AiProviderPort,
      cache,
      metrics,
      outOfSegment as unknown as OutOfSegmentService,
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
    aiProvider.complete.mockResolvedValue({ text: '{"ok":true}', modelTier: 'haiku' });

    const result = await service.orchestrate({
      featureId: 'outcome_mapper',
      bandId: 'band-1',
      variables: { observation_text: 'counted blocks' },
    });

    expect(result.modelTier).toBe('haiku');
    expect(aiProvider.complete).toHaveBeenCalledWith(
      expect.objectContaining({ modelTier: 'haiku', system: 'Obs: counted blocks' }),
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

  describe('caching (P5-API-01)', () => {
    it('caches cacheable features: second identical request skips the AI provider', async () => {
      repository.findPrompt.mockResolvedValue(METHODS_PROMPT);
      aiProvider.complete.mockResolvedValue({ text: 'use counters', modelTier: 'haiku' });

      const first = await service.orchestrate({
        featureId: 'methods_toolkit',
        bandId: 'band-1',
        variables: { activity_type: 'peer_practice', outcome_statement: 'counts to 20' },
      });
      const second = await service.orchestrate({
        featureId: 'methods_toolkit',
        bandId: 'band-1',
        variables: { activity_type: 'peer_practice', outcome_statement: 'counts to 20' },
      });

      expect(first.cached).toBe(false);
      expect(second.cached).toBe(true);
      expect(second.text).toBe('use counters');
      expect(aiProvider.complete).toHaveBeenCalledTimes(1);
    });

    it('defense-in-depth: non-allowlisted vars never split the key (so they can never leak into cache)', async () => {
      // Callers are child-agnostic for cacheable features, but even if a stray
      // identity var slipped in, the content-only key must ignore it — the cached
      // payload must never be keyed on (or vary by) child/tier identity.
      repository.findPrompt.mockResolvedValue(METHODS_PROMPT);
      aiProvider.complete.mockResolvedValue({ text: 'use counters', modelTier: 'haiku' });

      await service.orchestrate({
        featureId: 'methods_toolkit',
        bandId: 'band-1',
        variables: {
          activity_type: 'peer_practice',
          outcome_statement: 'counts to 20',
          child_name: 'Nisha',
          school_tier: 'free',
        },
      });
      const hit = await service.orchestrate({
        featureId: 'methods_toolkit',
        bandId: 'band-1',
        variables: {
          activity_type: 'peer_practice',
          outcome_statement: 'counts to 20',
          child_name: 'Rohan',
          school_tier: 'pro',
        },
      });

      expect(hit.cached).toBe(true);
      expect(aiProvider.complete).toHaveBeenCalledTimes(1);
    });

    it('tracks remedial-activity cache separately in metrics', async () => {
      repository.findPrompt.mockResolvedValue(METHODS_PROMPT);
      aiProvider.complete.mockResolvedValue({ text: 'use counters', modelTier: 'haiku' });

      await service.orchestrate({
        featureId: 'methods_toolkit',
        bandId: 'band-1',
        variables: { activity_type: 'peer_practice', outcome_statement: 'counts to 20' },
      });
      await service.orchestrate({
        featureId: 'methods_toolkit',
        bandId: 'band-1',
        variables: { activity_type: 'peer_practice', outcome_statement: 'counts to 20' },
      });

      const snapshot = service.getCacheMetrics();
      expect(snapshot.remedialActivity.featureId).toBe('methods_toolkit');
      expect(snapshot.remedialActivity.hits).toBe(1);
      expect(snapshot.remedialActivity.misses).toBe(1);
      expect(snapshot.remedialActivity.hitRate).toBe(0.5);
    });

    it('does not cache non-cacheable features', async () => {
      repository.findPrompt.mockResolvedValue({
        id: 'p2',
        feature_id: 'classroom_coach',
        band_id: 'band-1',
        model_tier: 'haiku',
        system_template: 'Coach: {{message_text}}',
        validator_keys: [],
      });
      aiProvider.complete.mockResolvedValue({ text: 'try this', modelTier: 'haiku' });

      await service.orchestrate({
        featureId: 'classroom_coach',
        bandId: 'band-1',
        variables: { message_text: 'a' },
      });
      await service.orchestrate({
        featureId: 'classroom_coach',
        bandId: 'band-1',
        variables: { message_text: 'a' },
      });

      expect(aiProvider.complete).toHaveBeenCalledTimes(2);
    });
  });

  describe('out-of-segment demand signal (P5-API-02)', () => {
    it('checks licence when school context is supplied', async () => {
      repository.findPrompt.mockResolvedValue(METHODS_PROMPT);
      aiProvider.complete.mockResolvedValue({ text: 'x', modelTier: 'haiku' });

      await service.orchestrate({
        featureId: 'methods_toolkit',
        bandId: 'band-1',
        variables: { activity_type: 'peer_practice', outcome_statement: 'y' },
        context: { schoolId: 'school-1' },
      });

      expect(outOfSegment.logIfOutOfSegment).toHaveBeenCalledWith(
        'school-1',
        'methods_toolkit',
        'band-1',
      );
    });

    it('skips the check when no school context is supplied', async () => {
      repository.findPrompt.mockResolvedValue(METHODS_PROMPT);
      aiProvider.complete.mockResolvedValue({ text: 'x', modelTier: 'haiku' });

      await service.orchestrate({
        featureId: 'methods_toolkit',
        bandId: 'band-1',
        variables: { activity_type: 'peer_practice', outcome_statement: 'y' },
      });

      expect(outOfSegment.logIfOutOfSegment).not.toHaveBeenCalled();
    });
  });
});
