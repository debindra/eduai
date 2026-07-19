import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import type { TeacherAssignmentDto, TeacherContextResponseDto } from './dto/teacher-context.dto';

type SectionJoin = {
  id: string;
  name: string;
  grade: string;
  band_id: string;
  bands: { id: string; assessment_mode: string } | { id: string; assessment_mode: string }[] | null;
};

type SubjectJoin = {
  id: string;
  name_en: string;
} | null;

type AssignmentRow = {
  section_id: string;
  subject_id: string | null;
  is_class_teacher: boolean;
  sections: SectionJoin | SectionJoin[] | null;
  subjects: SubjectJoin | SubjectJoin[];
};

@Injectable()
export class TeacherContextService {
  constructor(private readonly supabase: SupabaseService) {}

  private client() {
    const c = this.supabase.getClient();
    if (!c) throw new Error('Supabase is not configured');
    return c;
  }

  async getContext(teacherId: string): Promise<TeacherContextResponseDto> {
    const { data, error } = await this.client()
      .from('teacher_sections')
      .select(
        `
        section_id,
        subject_id,
        is_class_teacher,
        sections!inner(
          id,
          name,
          grade,
          band_id,
          bands!inner(id, assessment_mode)
        ),
        subjects(id, name_en)
      `,
      )
      .eq('teacher_id', teacherId);

    if (error) throw error;

    const assignments = ((data as AssignmentRow[] | null) ?? []).map((row) =>
      this.mapAssignment(row),
    );

    return { teacherId, assignments };
  }

  private mapAssignment(row: AssignmentRow): TeacherAssignmentDto {
    const section = Array.isArray(row.sections) ? row.sections[0] : row.sections;
    if (!section) {
      throw new Error('teacher_sections row missing section join');
    }
    const band = Array.isArray(section.bands) ? section.bands[0] : section.bands;
    if (!band?.assessment_mode) {
      throw new Error(`Section ${section.id} is missing band assessment_mode`);
    }
    const subject = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;

    return {
      sectionId: section.id,
      sectionName: section.name,
      grade: section.grade,
      bandId: section.band_id,
      assessmentMode: band.assessment_mode,
      subjectId: row.subject_id,
      subjectName: subject?.name_en ?? null,
      isClassTeacher: row.is_class_teacher,
    };
  }
}
