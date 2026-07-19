import { apiFetch } from '../../lib/shared/api/client';
import {
  getSelectedSubjectId,
  requireBandId,
  requireSectionId,
} from '../../lib/shared/stores/teacher-context';

/** @deprecated Prefer requireSectionId from teacher-context store. */
export function getTeacherSectionId(): string {
  return requireSectionId();
}

/** @deprecated Prefer requireBandId from teacher-context store. */
export function getTeacherBandId(): string {
  return requireBandId();
}

export async function proposeBatchSweep(
  items: Array<{
    childId: string;
    outcomeId: string;
    ratingCode: string;
    note?: string;
  }>,
) {
  return apiFetch<{ proposed: Array<{ id: string }> }>(
    `/outcomes/${requireSectionId()}/propose/batch-sweep`,
    {
      method: 'POST',
      body: { items, subjectId: getSelectedSubjectId() },
    },
  );
}

export async function confirmOutcome(proposalId: string) {
  return apiFetch(`/outcomes/${proposalId}/confirm`, {
    method: 'POST',
    body: {},
  });
}

export async function listProposed() {
  return apiFetch<
    Array<{ id: string; childId: string; ratingCode: string; state: string }>
  >(`/outcomes/${requireSectionId()}/proposed`);
}

export type SweepContextChild = {
  childId: string;
  name: string;
  rollNumber: string;
};

export type SweepContextOutcome = {
  outcomeId: string;
  code: string;
  statement: string;
};

export type SweepContextResponse = {
  sectionId: string;
  bandId: string;
  subjectId: string | null;
  children: SweepContextChild[];
  outcomes: SweepContextOutcome[];
};

export async function getSweepContext() {
  const sectionId = requireSectionId();
  const subjectId = getSelectedSubjectId();
  const q = subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : '';
  return apiFetch<SweepContextResponse>(
    `/outcomes/${sectionId}/sweep-context${q}`,
  );
}
