import { apiFetch } from '../../lib/shared/api/client';
import { getAdminSchoolId } from '../admin/api';
import {
  requireBandId,
  requireSectionId,
} from '../../lib/shared/stores/teacher-context';
import type { FestivalPlannerShape, SettlingProgrammeShape } from './manage-logic';

export interface AdminFestivalPlannerShape {
  schoolId: string;
  sectionsBehindCount: number;
  sectionsTotal: number;
  festivals: Array<{ id: string; name: string; startDate: string; endDate: string }>;
}

export async function getFestivalPlanner() {
  return apiFetch<FestivalPlannerShape>(
    `/manage/${requireSectionId()}/festival-planner`,
  );
}

/** Admin-only — school altitude, no teacher profile. */
export async function getAdminFestivalPlanner() {
  return apiFetch<AdminFestivalPlannerShape>(
    `/manage/admin/festival-planner?schoolId=${getAdminSchoolId()}`,
  );
}

export async function getSettlingProgramme(bandId?: string) {
  const resolvedBandId = bandId ?? requireBandId();
  return apiFetch<SettlingProgrammeShape>(
    `/manage/settling-programme/${resolvedBandId}`,
  );
}

export async function getSubstitutePack() {
  return apiFetch<{ sectionId: string; day: string; roster: unknown[]; note: string }>(
    `/manage/${requireSectionId()}/substitute-pack`,
  );
}
