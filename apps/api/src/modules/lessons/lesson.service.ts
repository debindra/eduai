import { Injectable } from '@nestjs/common';
import { selectPedagogy } from '@eduai/ai';
import { SupabaseService } from '../../database/supabase.service';
import { AiOrchestrationService } from '../ai-orchestration/ai-orchestration.service';
import { PlanningCascadeService } from '../planning-cascade/planning-cascade.service';

@Injectable()
export class LessonRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private client() {
    const c = this.supabase.getClient();
    if (!c) throw new Error('Supabase is not configured');
    return c;
  }

  async insertDraft(row: {
    map_slice_id: string;
    section_id: string;
    pedagogy_type: string;
    content: Record<string, unknown>;
    generated_by: string | null;
  }) {
    const { data, error } = await this.client()
      .from('lesson_drafts')
      .insert(row)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async markDone(mapSliceId: string, sectionId: string, teacherId: string | null) {
    const { data: existing } = await this.client()
      .from('lesson_progress')
      .select('id')
      .eq('map_slice_id', mapSliceId)
      .eq('section_id', sectionId)
      .maybeSingle();

    if (existing) {
      const { data, error } = await this.client()
        .from('lesson_progress')
        .update({
          status: 'done',
          marked_at: new Date().toISOString(),
          teacher_id: teacherId,
        })
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    }

    const { data, error } = await this.client()
      .from('lesson_progress')
      .insert({
        map_slice_id: mapSliceId,
        section_id: sectionId,
        teacher_id: teacherId,
        status: 'done',
        marked_at: new Date().toISOString(),
      })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async getSlice(mapSliceId: string) {
    const { data, error } = await this.client()
      .from('map_slices')
      .select('*')
      .eq('id', mapSliceId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
}

@Injectable()
export class LessonService {
  constructor(
    private readonly repository: LessonRepository,
    private readonly planning: PlanningCascadeService,
    private readonly ai: AiOrchestrationService,
  ) {}

  async generate(
    sectionId: string,
    bandId: string,
    date: string,
    teacherId: string | null,
  ) {
    const daily = await this.planning.getDaily(sectionId, date);
    if (!daily.mapSliceId) {
      throw new Error('No map slice for this day');
    }
    const slice = await this.repository.getSlice(daily.mapSliceId);
    const theme = (slice?.theme_or_chapter as string) ?? daily.themeOrChapter ?? '';
    const pedagogy = selectPedagogy(theme);

    const aiResult = await this.ai.orchestrate({
      featureId: 'lesson_generator',
      bandId,
      variables: {
        map_slice_json: JSON.stringify({
          theme,
          teachingDayIndex: daily.teachingDayIndex,
          mapSliceId: daily.mapSliceId,
        }),
        band_id: bandId,
        teacher_experience_signal: 'newer',
      },
    });

    const draft = await this.repository.insertDraft({
      map_slice_id: daily.mapSliceId,
      section_id: sectionId,
      pedagogy_type: pedagogy,
      content: {
        text: aiResult.text,
        theme,
        pedagogy,
      },
      generated_by: teacherId,
    });

    return {
      id: draft.id as string,
      mapSliceId: daily.mapSliceId,
      pedagogyType: pedagogy,
      theme,
      content: draft.content,
    };
  }

  /** Coverage only — never calls AI, never writes student_outcomes. */
  async markDone(sectionId: string, mapSliceId: string, teacherId: string | null) {
    const row = await this.repository.markDone(mapSliceId, sectionId, teacherId);
    return {
      id: row.id as string,
      status: row.status as string,
      mapSliceId,
      sectionId,
    };
  }
}
