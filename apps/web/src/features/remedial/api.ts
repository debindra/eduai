import { apiFetch } from '../../lib/shared/api/client';
import { getAdminSchoolId } from '../admin/api';
import { getGrade1SectionId } from '../subject/api';
import type { AdminOpenLoopCountsShape, RemedialListShape } from './remedial-logic';

export async function getRemedialPlans() {
  return apiFetch<RemedialListShape>(`/remedial/section/${getGrade1SectionId()}/plans`);
}

export async function getAdminOpenLoopCounts() {
  return apiFetch<AdminOpenLoopCountsShape>(
    `/remedial/admin/open-loop-counts?schoolId=${getAdminSchoolId()}`,
  );
}
