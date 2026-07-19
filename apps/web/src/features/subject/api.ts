import { apiFetch } from '../../lib/shared/api/client';
import {
  requireSectionId,
  requireSubjectId,
} from '../../lib/shared/stores/teacher-context';
import type { OversightShape, SubjectViewShape } from './subject-logic';

export async function getSubjectView(subjectId?: string) {
  const sectionId = requireSectionId();
  const resolvedSubjectId = subjectId ?? requireSubjectId();
  return apiFetch<SubjectViewShape>(
    `/subject/section/${sectionId}/subject/${resolvedSubjectId}`,
  );
}

export async function getClassTeacherOversight() {
  const sectionId = requireSectionId();
  return apiFetch<OversightShape>(`/subject/section/${sectionId}/oversight`);
}
