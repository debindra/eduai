import { Injectable } from '@nestjs/common';
import { AiOrchestrationService } from '../ai-orchestration/ai-orchestration.service';
import { SupabaseService } from '../../database/supabase.service';

/** Config-driven generation menu — activity types, not grade branches. */
export const METHODS_TOOLKIT_MENU = [
  { id: 'reteach_small_group', label: 'Small-group re-teach', activityType: 'reteach_small_group' },
  { id: 'peer_practice', label: 'Peer practice pair', activityType: 'peer_practice' },
  { id: 'concrete_manipulatives', label: 'Concrete manipulatives', activityType: 'concrete_manipulatives' },
  { id: 'home_practice_card', label: 'Home practice card', activityType: 'home_practice_card' },
] as const;

@Injectable()
export class MethodsToolkitRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private client() {
    const c = this.supabase.getClient();
    if (!c) throw new Error('Supabase is not configured');
    return c;
  }

  async findOutcome(outcomeId: string) {
    const { data, error } = await this.client()
      .from('outcomes')
      .select('id, statement_en, band_id, subject_id')
      .eq('id', outcomeId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async findChild(childId: string) {
    const { data, error } = await this.client()
      .from('children')
      .select('id, section_id, sections(school_id)')
      .eq('id', childId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
}

function resolveSchoolId(child: Record<string, unknown>): string | undefined {
  const sections = child.sections as
    | { school_id: string }
    | { school_id: string }[]
    | null
    | undefined;
  if (Array.isArray(sections)) return sections[0]?.school_id;
  return sections?.school_id;
}

@Injectable()
export class MethodsToolkitService {
  constructor(
    private readonly repository: MethodsToolkitRepository,
    private readonly ai: AiOrchestrationService,
  ) {}

  getMenu() {
    return {
      items: METHODS_TOOLKIT_MENU.map((m) => ({
        id: m.id,
        label: m.label,
        activityType: m.activityType,
      })),
    };
  }

  /**
   * Generate a remedial activity. Same prompt template for free/pro (parity).
   * Returns activityRef for RemedialService.deliverActivity.
   */
  async generate(input: {
    bandId: string;
    outcomeId: string;
    childId: string;
    activityType: string;
    schoolTier?: string;
  }) {
    const outcome = await this.repository.findOutcome(input.outcomeId);
    if (!outcome) throw new Error('Outcome not found');
    const child = await this.repository.findChild(input.childId);
    if (!child) throw new Error('Child not found');

    // The generated activity is child-agnostic so it can be safely content-cached
    // and shared across children/schools (see cache-key.ts CACHE_CONFIG). The
    // teacher addresses the specific child at delivery. schoolTier is passed for
    // parity logging but never changes the prompt/model, and is excluded from the
    // cache key.
    const result = await this.ai.orchestrate({
      featureId: 'methods_toolkit',
      bandId: input.bandId,
      variables: {
        activity_type: input.activityType,
        outcome_statement: outcome.statement_en as string,
        school_tier: input.schoolTier ?? 'pilot',
      },
      context: { schoolId: resolveSchoolId(child) },
    });

    const activityRef = `methods:${input.activityType}:${input.outcomeId}:${Date.now()}`;
    return {
      activityRef,
      activityType: input.activityType,
      text: result.text,
      modelTier: result.modelTier,
      // Explicit: tier does not affect quality
      generationParity: true,
    };
  }
}
