import { apiFetch } from '../../lib/shared/api/client';
import type { OversightShape, SubjectViewShape } from './subject-logic';

/** Dev default: Grade 1 A section + math subject from Phase 3 seed. */
export const GRADE1_SECTION_ID = '66666666-6666-6666-6666-666666666667';
export const DEFAULT_SUBJECT_ID = 'd1111111-1111-1111-1111-111111111113';

export function getGrade1SectionId(): string {
  return GRADE1_SECTION_ID;
}

export async function getSubjectView(subjectId = DEFAULT_SUBJECT_ID) {
  const sectionId = getGrade1SectionId();
  return apiFetch<SubjectViewShape>(`/subject/section/${sectionId}/subject/${subjectId}`);
}

export async function getClassTeacherOversight() {
  const sectionId = getGrade1SectionId();
  return apiFetch<OversightShape>(`/subject/section/${sectionId}/oversight`);
}
