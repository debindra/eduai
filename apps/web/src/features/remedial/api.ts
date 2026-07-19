import { apiFetch } from '../../lib/shared/api/client';
import { getAdminSchoolId } from '../admin/api';
import { requireSectionId } from '../../lib/shared/stores/teacher-context';
import type { AdminOpenLoopCountsShape, RemedialListShape } from './remedial-logic';

export async function getRemedialPlans() {
  return apiFetch<RemedialListShape>(
    `/remedial/section/${requireSectionId()}/plans`,
  );
}

export async function getAdminOpenLoopCounts() {
  return apiFetch<AdminOpenLoopCountsShape>(
    `/remedial/admin/open-loop-counts?schoolId=${getAdminSchoolId()}`,
  );
}
