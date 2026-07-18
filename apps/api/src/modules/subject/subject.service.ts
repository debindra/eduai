import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { AggregationService } from '../aggregation/aggregation.service';

@Injectable()
export class SubjectRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private client() {
    const c = this.supabase.getClient();
    if (!c) throw new Error('Supabase is not configured');
    return c;
  }

  async listTeacherSubjects(teacherId: string, sectionId: string) {
    const { data, error } = await this.client()
      .from('teacher_sections')
      .select('id, subject_id, is_class_teacher')
      .eq('teacher_id', teacherId)
      .eq('section_id', sectionId);
    if (error) throw error;
    return data ?? [];
  }

  async listOutcomesForSubject(bandId: string, subjectId: string) {
    const { data, error } = await this.client()
      .from('outcomes')
      .select('id, code, statement_en, subject_id')
      .eq('band_id', bandId)
      .eq('subject_id', subjectId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async findSection(sectionId: string) {
    const { data, error } = await this.client()
      .from('sections')
      .select('id, band_id, name, grade')
      .eq('id', sectionId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async listChildren(sectionId: string) {
    const { data, error } = await this.client()
      .from('children')
      .select('id, name, roll_number')
      .eq('section_id', sectionId)
      .eq('status', 'active')
      .order('roll_number', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async listConfirmedBySubject(sectionId: string, subjectId: string | null) {
    let query = this.client()
      .from('student_outcomes')
      .select('id, child_id, outcome_id, rating_code, subject_id, attempt, state')
      .eq('section_id', sectionId)
      .eq('state', 'confirmed');
    if (subjectId === null) {
      query = query.is('subject_id', null);
    } else {
      query = query.eq('subject_id', subjectId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async findSubject(subjectId: string) {
    const { data, error } = await this.client()
      .from('subjects')
      .select('id, code, name_en')
      .eq('id', subjectId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
}

@Injectable()
export class SubjectService {
  constructor(
    private readonly repository: SubjectRepository,
    private readonly aggregation: AggregationService,
  ) {}

  /** Subject-teacher write view: outcomes for their subject + section roster (read). */
  async getSubjectTeacherView(
    teacherId: string,
    sectionId: string,
    subjectId: string,
  ) {
    const grains = await this.repository.listTeacherSubjects(teacherId, sectionId);
    const subjectGrain = grains.find((g) => g.subject_id === subjectId);
    if (!subjectGrain && !grains.some((g) => g.is_class_teacher)) {
      throw new Error('Write scope denied for section/subject grain');
    }

    const section = await this.repository.findSection(sectionId);
    if (!section) throw new Error('Section not found');
    const [subject, outcomes, children, confirmed] = await Promise.all([
      this.repository.findSubject(subjectId),
      this.repository.listOutcomesForSubject(section.band_id as string, subjectId),
      this.repository.listChildren(sectionId),
      this.repository.listConfirmedBySubject(sectionId, subjectId),
    ]);

    return {
      sectionId,
      subjectId,
      subjectName: subject?.name_en ?? null,
      writeScope: subjectGrain ? 'subject' : 'class_teacher_read',
      hasWriteGrain: Boolean(subjectGrain),
      outcomes: outcomes.map((o) => ({
        id: o.id as string,
        code: o.code as string,
        statement: o.statement_en as string,
      })),
      children: children.map((c) => ({
        id: c.id as string,
        name: c.name as string,
        rollNumber: c.roll_number as string,
      })),
      confirmedCount: confirmed.length,
      confirmed: confirmed.map((r) => ({
        id: r.id as string,
        childId: r.child_id as string,
        outcomeId: r.outcome_id as string,
        ratingCode: r.rating_code as string,
        attempt: r.attempt as string,
      })),
    };
  }

  /** Class-teacher oversight: section-wide confirmed counts + optional per-child letter. */
  async getClassTeacherOversight(sectionId: string) {
    const section = await this.repository.findSection(sectionId);
    if (!section) throw new Error('Section not found');
    const children = await this.repository.listChildren(sectionId);
    const childSummaries = [];
    for (const child of children) {
      let letter: string | null = null;
      let percent: number | null = null;
      try {
        const agg = await this.aggregation.aggregateChild(child.id as string);
        letter = agg.letterCode;
        percent = agg.percent;
      } catch {
        // No confirmed ratings yet — leave null
      }
      childSummaries.push({
        childId: child.id as string,
        name: child.name as string,
        rollNumber: child.roll_number as string,
        letterCode: letter,
        percent,
      });
    }
    return {
      sectionId,
      sectionName: section.name as string,
      grade: section.grade as string,
      children: childSummaries,
    };
  }
}
