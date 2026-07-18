import { Injectable, Logger } from '@nestjs/common';
import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiProviderPort,
} from '../../../shared/ports/ai-provider.port';

/** Console stub — replace with Anthropic adapter without changing callers. */
@Injectable()
export class ConsoleAiAdapter implements AiProviderPort {
  private readonly logger = new Logger(ConsoleAiAdapter.name);

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    this.logger.debug(
      `AI stub complete tier=${request.modelTier} systemLen=${request.system.length}`,
    );
    if (request.modelTier === 'none') {
      return { text: '', modelTier: 'none' };
    }
    return {
      text: JSON.stringify({
        stub: true,
        tier: request.modelTier,
        echo: request.user.slice(0, 200),
      }),
      modelTier: request.modelTier,
    };
  }
}
