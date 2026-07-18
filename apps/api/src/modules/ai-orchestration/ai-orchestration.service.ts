import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  renderTemplate,
  runValidators,
  type MapperProposalInput,
} from '@eduai/ai';
import {
  AI_PROVIDER_PORT,
  type AiProviderPort,
} from '../../shared/ports/ai-provider.port';
import { CACHE_PORT, type CachePort } from '../../shared/ports/cache.port';
import { OutOfSegmentService } from '../out-of-segment/out-of-segment.service';
import { AiOrchestrationRepository } from './ai-orchestration.repository';
import { buildCacheKey, CACHE_CONFIG } from './cache-key';
import { CacheMetricsService } from './cache-metrics.service';

export interface OrchestrateInput {
  featureId: string;
  bandId: string;
  variables: Record<string, string>;
  userMessage?: string;
  mapper?: MapperProposalInput;
  /** School context enables the out-of-segment demand signal (P5-API-02). */
  context?: { schoolId?: string };
}

export interface OrchestrateResult {
  text: string;
  modelTier: string;
  validatorKeys: string[];
  cached: boolean;
}

@Injectable()
export class AiOrchestrationService {
  constructor(
    private readonly repository: AiOrchestrationRepository,
    @Inject(AI_PROVIDER_PORT) private readonly aiProvider: AiProviderPort,
    @Inject(CACHE_PORT) private readonly cache: CachePort,
    private readonly metrics: CacheMetricsService,
    private readonly outOfSegment: OutOfSegmentService,
  ) {}

  async orchestrate(input: OrchestrateInput): Promise<OrchestrateResult> {
    const prompt = await this.repository.findPrompt(input.featureId, input.bandId);
    if (!prompt) {
      throw new NotFoundException(
        `No prompt for feature=${input.featureId} band=${input.bandId}`,
      );
    }

    if (input.context?.schoolId) {
      await this.outOfSegment.logIfOutOfSegment(
        input.context.schoolId,
        input.featureId,
        input.bandId,
      );
    }

    const system = renderTemplate(prompt.system_template, input.variables);
    const user = input.userMessage ?? input.variables.observation_text ?? '';

    if (prompt.model_tier === 'none') {
      return {
        text: '',
        modelTier: 'none',
        validatorKeys: prompt.validator_keys,
        cached: false,
      };
    }

    const cacheConfig = CACHE_CONFIG[input.featureId];
    let cacheKey: string | null = null;
    if (cacheConfig) {
      cacheKey = buildCacheKey(input.featureId, input.bandId, input.variables);
      const cached = await this.cache.get(cacheKey);
      if (cached !== null) {
        this.metrics.record(input.featureId, true);
        return {
          text: cached,
          modelTier: prompt.model_tier,
          validatorKeys: prompt.validator_keys,
          cached: true,
        };
      }
    }

    const completion = await this.aiProvider.complete({
      modelTier: prompt.model_tier,
      system,
      user,
    });

    const validation = runValidators(prompt.validator_keys, {
      text: completion.text,
      mapper: input.mapper,
    });
    if (!validation.ok) {
      throw new Error(`AI output failed validators: ${validation.errors.join('; ')}`);
    }

    if (cacheKey && cacheConfig) {
      await this.cache.set(cacheKey, completion.text, cacheConfig.ttlSeconds);
      this.metrics.record(input.featureId, false);
    }

    return {
      text: completion.text,
      modelTier: completion.modelTier,
      validatorKeys: prompt.validator_keys,
      cached: false,
    };
  }

  getCacheMetrics() {
    return this.metrics.snapshot();
  }
}
