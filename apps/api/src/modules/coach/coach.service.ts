import { BadRequestException, Injectable } from '@nestjs/common';
import { detectSafeguardingSignal } from '@eduai/ai';
import { SupabaseService } from '../../database/supabase.service';
import { AiOrchestrationService } from '../ai-orchestration/ai-orchestration.service';

@Injectable()
export class CoachRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private client() {
    const c = this.supabase.getClient();
    if (!c) throw new Error('Supabase is not configured');
    return c;
  }

  async insertMessage(row: {
    teacher_id: string;
    school_id: string;
    role: 'user' | 'assistant' | 'system';
    body: string;
    safeguarding_flagged: boolean;
  }) {
    const { data, error } = await this.client()
      .from('coach_messages')
      .insert(row)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }
}

@Injectable()
export class CoachService {
  constructor(
    private readonly repository: CoachRepository,
    private readonly ai: AiOrchestrationService,
  ) {}

  async chat(input: {
    teacherId: string;
    schoolId: string;
    bandId: string;
    message: string;
    childId?: string;
  }) {
    if (input.childId) {
      throw new BadRequestException('Coach chat must never include child_id');
    }

    const safeguarding = detectSafeguardingSignal(input.message);
    await this.repository.insertMessage({
      teacher_id: input.teacherId,
      school_id: input.schoolId,
      role: 'user',
      body: input.message,
      safeguarding_flagged: safeguarding,
    });

    if (safeguarding) {
      const reply =
        'Possible safeguarding concern detected. Escalate immediately to the class teacher and principal. Do not continue coaching on this topic.';
      await this.repository.insertMessage({
        teacher_id: input.teacherId,
        school_id: input.schoolId,
        role: 'assistant',
        body: reply,
        safeguarding_flagged: true,
      });
      return { reply, safeguarding: true };
    }

    const result = await this.ai.orchestrate({
      featureId: 'classroom_coach',
      bandId: input.bandId,
      variables: { message_text: input.message },
      userMessage: input.message,
    });

    await this.repository.insertMessage({
      teacher_id: input.teacherId,
      school_id: input.schoolId,
      role: 'assistant',
      body: result.text,
      safeguarding_flagged: false,
    });

    return { reply: result.text, safeguarding: false };
  }
}
