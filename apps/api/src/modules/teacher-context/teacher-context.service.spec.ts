import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseService } from '../../database/supabase.service';
import { TeacherContextService } from './teacher-context.service';

describe('TeacherContextService', () => {
  let service: TeacherContextService;
  let getClient: ReturnType<typeof vi.fn>;
  let eq: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getClient = vi.fn();
    eq = vi.fn();
    service = new TeacherContextService({
      getClient,
    } as unknown as SupabaseService);
  });

  it('returns mapped assignments for a multi-section teacher', async () => {
    eq.mockResolvedValue({
      data: [
        {
          section_id: 'sec-ukg',
          subject_id: null,
          is_class_teacher: true,
          sections: {
            id: 'sec-ukg',
            name: 'UKG A',
            grade: 'UKG',
            band_id: 'band-pp',
            bands: { id: 'band-pp', assessment_mode: 'three_state_narrative' },
          },
          subjects: null,
        },
        {
          section_id: 'sec-g1',
          subject_id: 'subj-math',
          is_class_teacher: false,
          sections: {
            id: 'sec-g1',
            name: 'Grade 1 A',
            grade: 'Grade 1',
            band_id: 'band-early',
            bands: { id: 'band-early', assessment_mode: 'four_point_scale' },
          },
          subjects: { id: 'subj-math', name_en: 'Mathematics' },
        },
      ],
      error: null,
    });

    getClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq }),
      }),
    });

    const result = await service.getContext('teacher-1');

    expect(eq).toHaveBeenCalledWith('teacher_id', 'teacher-1');
    expect(result).toEqual({
      teacherId: 'teacher-1',
      assignments: [
        {
          sectionId: 'sec-ukg',
          sectionName: 'UKG A',
          grade: 'UKG',
          bandId: 'band-pp',
          assessmentMode: 'three_state_narrative',
          subjectId: null,
          subjectName: null,
          isClassTeacher: true,
        },
        {
          sectionId: 'sec-g1',
          sectionName: 'Grade 1 A',
          grade: 'Grade 1',
          bandId: 'band-early',
          assessmentMode: 'four_point_scale',
          subjectId: 'subj-math',
          subjectName: 'Mathematics',
          isClassTeacher: false,
        },
      ],
    });
  });

  it('returns empty assignments when the teacher has no sections', async () => {
    eq.mockResolvedValue({ data: [], error: null });
    getClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq }),
      }),
    });

    const result = await service.getContext('teacher-2');
    expect(result).toEqual({ teacherId: 'teacher-2', assignments: [] });
  });
});
