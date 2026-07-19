import { apiFetch } from '../../lib/shared/api/client';
import { getAdminSchoolId } from '../admin/api';
import { requireSectionId } from '../../lib/shared/stores/teacher-context';
import type { SchoolEcaCcaBundle } from '../eca-cca/eca-cca-logic';
import {
  pickDefaultSettlingBandId,
  type FestivalPlannerShape,
  type SettlingProgrammeShape,
} from './manage-logic';

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

export async function getSettlingProgramme(bandId: string) {
  return apiFetch<SettlingProgrammeShape>(
    `/manage/settling-programme/${bandId}`,
  );
}

/** Admin-only — resolves a band from config, never teacher context. */
export async function getAdminSettlingProgramme(): Promise<SettlingProgrammeShape | null> {
  const response = await apiFetch<{ bands: Array<{ id: string; code: string }> }>('/bands');
  const bandId = pickDefaultSettlingBandId(response.bands ?? []);
  if (!bandId) return null;
  return getSettlingProgramme(bandId);
}

export async function getSubstitutePack() {
  return apiFetch<{ sectionId: string; day: string; roster: unknown[]; note: string }>(
    `/manage/${requireSectionId()}/substitute-pack`,
  );
}

export async function getSchoolEcaCcaBundle() {
  const schoolId = getAdminSchoolId();
  return apiFetch<SchoolEcaCcaBundle>(`/schools/${schoolId}/eca-cca`);
}

export async function enableSchoolEcaCcaCatalogItem(catalogId: string) {
  const schoolId = getAdminSchoolId();
  return apiFetch(`/schools/${schoolId}/eca-cca/enable`, {
    method: 'POST',
    body: { catalogId },
  });
}

export async function createSchoolOnlyEcaCca(body: {
  name: string;
  kind: 'eca' | 'cca';
  iconKey: string;
}) {
  const schoolId = getAdminSchoolId();
  return apiFetch(`/schools/${schoolId}/eca-cca/school-only`, {
    method: 'POST',
    body,
  });
}

export async function patchSchoolEcaCcaItem(
  itemId: string,
  body: Partial<{
    name: string;
    kind: 'eca' | 'cca';
    iconKey: string;
    isActive: boolean;
  }>,
) {
  const schoolId = getAdminSchoolId();
  return apiFetch(`/schools/${schoolId}/eca-cca/${itemId}`, {
    method: 'PATCH',
    body,
  });
}

export async function deleteSchoolEcaCcaItem(itemId: string) {
  const schoolId = getAdminSchoolId();
  return apiFetch(`/schools/${schoolId}/eca-cca/${itemId}`, { method: 'DELETE' });
}
