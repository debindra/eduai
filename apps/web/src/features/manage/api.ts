import { apiFetch } from '../../lib/shared/api/client';
import { getTeacherSectionId } from '../outcomes/api';
import { getAdminSchoolId } from '../admin/api';
import type { FestivalPlannerShape, SettlingProgrammeShape } from './manage-logic';

const PRE_PRIMARY_BAND = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

export interface AdminFestivalPlannerShape {
  schoolId: string;
  sectionsBehindCount: number;
  sectionsTotal: number;
  festivals: Array<{ id: string; name: string; startDate: string; endDate: string }>;
}

export async function getFestivalPlanner() {
  return apiFetch<FestivalPlannerShape>(`/manage/${getTeacherSectionId()}/festival-planner`);
}

/** Admin-only — school altitude, no teacher profile. */
export async function getAdminFestivalPlanner() {
  return apiFetch<AdminFestivalPlannerShape>(
    `/manage/admin/festival-planner?schoolId=${getAdminSchoolId()}`,
  );
}

export async function getSettlingProgramme(bandId = PRE_PRIMARY_BAND) {
  return apiFetch<SettlingProgrammeShape>(`/manage/settling-programme/${bandId}`);
}

export async function getSubstitutePack() {
  return apiFetch<{ sectionId: string; day: string; roster: unknown[]; note: string }>(
    `/manage/${getTeacherSectionId()}/substitute-pack`,
  );
}
