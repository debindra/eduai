import { apiFetch } from '../../lib/shared/api/client';
import {
  requireBandId,
  requireSectionId,
} from '../../lib/shared/stores/teacher-context';

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
  }>(`/reports/${requireSectionId()}/monthly/draft`, {
    method: 'POST',
    body: {
      ...input,
      bandId: requireBandId(),
    },
  });
}

export async function approveReport(draftId: string) {
  return apiFetch(`/reports/${draftId}/approve`, { method: 'POST', body: {} });
}
