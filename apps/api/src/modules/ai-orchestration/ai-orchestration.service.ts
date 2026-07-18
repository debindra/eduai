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
import { AiOrchestrationRepository } from './ai-orchestration.repository';

export interface OrchestrateInput {
  featureId: string;
  bandId: string;
  variables: Record<string, string>;
  userMessage?: string;
  mapper?: MapperProposalInput;
}

export interface OrchestrateResult {
  text: string;
  modelTier: string;
  validatorKeys: string[];
}

@Injectable()
export class AiOrchestrationService {
  constructor(
    private readonly repository: AiOrchestrationRepository,
    @Inject(AI_PROVIDER_PORT) private readonly aiProvider: AiProviderPort,
  ) {}

  async orchestrate(input: OrchestrateInput): Promise<OrchestrateResult> {
    const prompt = await this.repository.findPrompt(input.featureId, input.bandId);
    if (!prompt) {
      throw new NotFoundException(
        `No prompt for feature=${input.featureId} band=${input.bandId}`,
      );
    }

    const system = renderTemplate(prompt.system_template, input.variables);
    const user = input.userMessage ?? input.variables.observation_text ?? '';

    if (prompt.model_tier === 'none') {
      return { text: '', modelTier: 'none', validatorKeys: prompt.validator_keys };
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

    return {
      text: completion.text,
      modelTier: completion.modelTier,
      validatorKeys: prompt.validator_keys,
    };
  }
}
