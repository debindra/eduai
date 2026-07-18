import { apiFetch } from '../../lib/shared/api/client';

const DEV_SECTION_ID = '66666666-6666-6666-6666-666666666666';
const DEV_BAND_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

export function getTeacherSectionId(): string {
  return DEV_SECTION_ID;
}

export function getTeacherBandId(): string {
  return DEV_BAND_ID;
}

export async function proposeBatchSweep(items: Array<{
  childId: string;
  outcomeId: string;
  ratingCode: string;
  note?: string;
}>) {
  return apiFetch<{ proposed: Array<{ id: string }> }>(
    `/outcomes/${getTeacherSectionId()}/propose/batch-sweep`,
    { method: 'POST', body: { items } },
  );
}

export async function confirmOutcome(proposalId: string) {
  return apiFetch(`/outcomes/${proposalId}/confirm`, {
    method: 'POST',
    body: {},
  });
}

export async function listProposed() {
  return apiFetch<Array<{ id: string; childId: string; ratingCode: string; state: string }>>(
    `/outcomes/${getTeacherSectionId()}/proposed`,
  );
}
