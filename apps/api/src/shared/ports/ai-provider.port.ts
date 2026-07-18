export type ModelTier = 'haiku' | 'sonnet' | 'none';

export interface AiCompletionRequest {
  modelTier: ModelTier;
  system: string;
  user: string;
}

export interface AiCompletionResponse {
  text: string;
  modelTier: ModelTier;
}

export interface AiProviderPort {
  complete(request: AiCompletionRequest): Promise<AiCompletionResponse>;
}

export const AI_PROVIDER_PORT = Symbol('AI_PROVIDER_PORT');
