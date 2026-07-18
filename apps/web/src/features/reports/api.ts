import { apiFetch } from '../../lib/shared/api/client';
import { getTeacherBandId, getTeacherSectionId } from '../outcomes/api';

export async function draftMonthlyReport(input: {
  childId: string;
  periodStart: string;
  periodEnd: string;
}) {
  return apiFetch<{
    id: string;
    bodyText: string | null;
    thinData: boolean;
    evidenceSnapshot: unknown;
    state: string;
  }>(`/reports/${getTeacherSectionId()}/monthly/draft`, {
    method: 'POST',
    body: {
      ...input,
      bandId: getTeacherBandId(),
    },
  });
}

export async function approveReport(draftId: string) {
  return apiFetch(`/reports/${draftId}/approve`, { method: 'POST', body: {} });
}
