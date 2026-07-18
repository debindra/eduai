import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import type { ModelTier } from '../../shared/ports/ai-provider.port';

export interface PromptRow {
  id: string;
  feature_id: string;
  band_id: string;
  model_tier: ModelTier;
  system_template: string;
  validator_keys: string[];
}

@Injectable()
export class AiOrchestrationRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async findPrompt(featureId: string, bandId: string): Promise<PromptRow | null> {
    const client = this.supabase.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('prompts')
      .select('id, feature_id, band_id, model_tier, system_template, validator_keys')
      .eq('feature_id', featureId)
      .eq('band_id', bandId)
      .maybeSingle();
    if (error) throw error;
    return data as PromptRow | null;
  }
}
