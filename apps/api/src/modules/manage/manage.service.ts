import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { AiOrchestrationService } from '../ai-orchestration/ai-orchestration.service';
import { PacingService } from '../pacing/pacing.service';

@Injectable()
export class ManageRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private client() {
    const c = this.supabase.getClient();
    if (!c) throw new Error('Supabase is not configured');
    return c;
  }

  async listSettlingSteps(bandId: string) {
    const { data, error } = await this.client()
      .from('settling_programme_steps')
      .select('week_number, title, body')
      .eq('band_id', bandId)
      .order('week_number', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async listChildren(sectionId: string) {
    const { data, error } = await this.client()
      .from('children')
      .select('id, name, roll_number')
      .eq('section_id', sectionId)
      .eq('status', 'active');
    if (error) throw error;
    return data ?? [];
  }

  async findChild(childId: string) {
    const { data, error } = await this.client()
      .from('children')
      .select('id, name, roll_number, section_id')
      .eq('id', childId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async listTeacherSections(sectionId: string) {
    const { data, error } = await this.client()
      .from('teacher_sections')
      .select('id, teacher_id, subject_id, is_class_teacher')
      .eq('section_id', sectionId);
    if (error) throw error;
    return data ?? [];
  }

  async findTodayLessonDraft(sectionId: string, day: string) {
    const { data: map } = await this.client()
      .from('yearly_map')
      .select('id')
      .eq('section_id', sectionId)
      .neq('status', 'superseded')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!map) return null;

    const { data: slices } = await this.client()
      .from('map_slices')
      .select('id, theme_or_chapter, teaching_day_index')
      .eq('yearly_map_id', map.id);
    const sliceIds = (slices ?? []).map((s) => s.id as string);
    if (sliceIds.length === 0) return null;

    const { data: drafts } = await this.client()
      .from('lesson_drafts')
      .select('id, map_slice_id, pedagogy_type, content')
      .eq('section_id', sectionId)
      .in('map_slice_id', sliceIds)
      .limit(1);
    return {
      day,
      draft: drafts?.[0] ?? null,
      themes: (slices ?? []).map((s) => s.theme_or_chapter),
    };
  }

  async listAbsentDays(childId: string) {
    const { data, error } = await this.client()
      .from('attendance_record')
      .select('day')
      .eq('child_id', childId)
      .eq('status', 'absent');
    if (error) throw error;
    return (data ?? []).map((r) => r.day as string);
  }

  async listDoneProgress(sectionId: string) {
    const { data, error } = await this.client()
      .from('lesson_progress')
      .select('map_slice_id, marked_at, status')
      .eq('section_id', sectionId)
      .eq('status', 'done');
    if (error) throw error;
    return data ?? [];
  }

  async listSliceThemes(sliceIds: string[]) {
    if (sliceIds.length === 0) return [];
    const { data, error } = await this.client()
      .from('map_slices')
      .select('id, theme_or_chapter')
      .in('id', sliceIds);
    if (error) throw error;
    return data ?? [];
  }

  async listFestivalClosures(sectionId: string) {
    const { data: section } = await this.client()
      .from('sections')
      .select('school_id')
      .eq('id', sectionId)
      .maybeSingle();
    if (!section) return [];
    return this.listFestivalClosuresBySchool(section.school_id as string);
  }

  async listFestivalClosuresBySchool(schoolId: string) {
    const { data: calendars } = await this.client()
      .from('school_calendars')
      .select('id')
      .eq('school_id', schoolId)
      .eq('approval_status', 'approved');
    const calendarIds = (calendars ?? []).map((c) => c.id as string);
    if (calendarIds.length === 0) return [];
    const { data, error } = await this.client()
      .from('calendar_closures')
      .select('id, name, start_date, end_date, source')
      .in('school_calendar_id', calendarIds)
      .eq('source', 'festival_template');
    if (error) throw error;
    return data ?? [];
  }

  async listSectionIds(schoolId: string) {
    const { data, error } = await this.client()
      .from('sections')
      .select('id')
      .eq('school_id', schoolId);
    if (error) throw error;
    return (data ?? []).map((s) => s.id as string);
  }
}

@Injectable()
export class ManageService {
  constructor(
    private readonly repository: ManageRepository,
    private readonly pacing: PacingService,
    private readonly ai: AiOrchestrationService,
  ) {}

  async getSettlingProgramme(bandId: string) {
    const steps = await this.repository.listSettlingSteps(bandId);
    return {
      bandId,
      steps: steps.map((s) => ({
        weekNumber: s.week_number as number,
        title: s.title as string,
        body: s.body as string,
      })),
    };
  }

  async getSubstitutePack(sectionId: string, day?: string) {
    const asOf = day ?? new Date().toISOString().slice(0, 10);
    const [children, schedule, lesson] = await Promise.all([
      this.repository.listChildren(sectionId),
      this.repository.listTeacherSections(sectionId),
      this.repository.findTodayLessonDraft(sectionId, asOf),
    ]);
    return {
      sectionId,
      day: asOf,
      roster: children.map((c) => ({
        id: c.id as string,
        name: c.name as string,
        rollNumber: c.roll_number as string | null,
      })),
      schedule,
      lesson,
      note: 'Substitute access is read-only for outcomes — confirmation is blocked by SubstituteRoleGuard.',
    };
  }

  async getCatchUpPack(sectionId: string, childId: string, bandId: string) {
    const child = await this.repository.findChild(childId);
    if (!child || child.section_id !== sectionId) {
      throw new NotFoundException('Child not found in section');
    }
    const absentDays = await this.repository.listAbsentDays(childId);
    const done = await this.repository.listDoneProgress(sectionId);
    const sliceIds = done.map((d) => d.map_slice_id as string);
    const themes = await this.repository.listSliceThemes(sliceIds);
    const missedThemes = themes
      .map((t) => t.theme_or_chapter as string | null)
      .filter((t): t is string => Boolean(t));

    let reteachText = '';
    if (missedThemes.length > 0) {
      const aiResult = await this.ai.orchestrate({
        featureId: 'catch_up_reteach',
        bandId,
        variables: {
          missed_themes: missedThemes.join(', '),
          child_name: child.name as string,
        },
      });
      reteachText = aiResult.text;
    }

    return {
      sectionId,
      childId,
      absentDays,
      missedThemes,
      reteachText,
    };
  }

  async getFestivalPlanner(sectionId: string) {
    const [closures, pacing] = await Promise.all([
      this.repository.listFestivalClosures(sectionId),
      this.pacing.getPacing(sectionId),
    ]);
    return {
      sectionId,
      pacingState: pacing.state,
      gapTeachingDays: pacing.gapTeachingDays,
      festivals: closures.map((c) => ({
        id: c.id as string,
        name: c.name as string,
        startDate: c.start_date as string,
        endDate: c.end_date as string,
      })),
    };
  }

  /** Admin school-altitude festival planner — no teacher_sections required. */
  async getAdminFestivalPlanner(schoolId: string) {
    const [closures, sectionIds] = await Promise.all([
      this.repository.listFestivalClosuresBySchool(schoolId),
      this.repository.listSectionIds(schoolId),
    ]);
    let sectionsBehindCount = 0;
    for (const sectionId of sectionIds) {
      const pacing = await this.pacing.getPacing(sectionId);
      if (pacing.state === 'behind') sectionsBehindCount += 1;
    }
    return {
      schoolId,
      sectionsBehindCount,
      sectionsTotal: sectionIds.length,
      festivals: closures.map((c) => ({
        id: c.id as string,
        name: c.name as string,
        startDate: c.start_date as string,
        endDate: c.end_date as string,
      })),
    };
  }
}
