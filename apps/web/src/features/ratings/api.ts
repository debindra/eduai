import { apiFetch } from '../../lib/shared/api/client';
import {
  getSelectedSubjectId,
  requireSectionId,
} from '../../lib/shared/stores/teacher-context';
import { getSweepContext, type SweepContextChild } from '../outcomes/api';

export type AssessmentArea = {
  id: string;
  subject_id: string;
  level_id: number;
  code: string;
  display_label: string;
  grouping_shape: 'skill' | 'content' | 'flat';
  default_sequence: number;
  indicator_count: number;
};

export type IndicatorRow = {
  id: string;
  code: string;
  statement_en: string;
  group_label: string | null;
  sort_order: number;
};

export async function listAssessmentAreas(levelId: number) {
  const subjectId = getSelectedSubjectId();
  if (!subjectId) {
    throw new Error('Select a subject assignment to load assessment areas');
  }
  return apiFetch<AssessmentArea[]>(
    `/ratings/areas?subjectId=${encodeURIComponent(subjectId)}&levelId=${levelId}`,
  );
}

export async function listAreaIndicators(areaId: string) {
  return apiFetch<{
    area: AssessmentArea;
    indicators: IndicatorRow[];
  }>(`/ratings/areas/${areaId}/indicators`);
}

export async function proposeIndicatorBatch(
  items: Array<{
    childId: string;
    indicatorId: string;
    rating: number;
    captureMode?: string;
  }>,
) {
  return apiFetch<{ proposed: Array<{ id: string }> }>(`/ratings/propose/batch`, {
    method: 'POST',
    body: { items },
  });
}

export async function confirmRating(proposalId: string) {
  return apiFetch(`/ratings/${proposalId}/confirm`, {
    method: 'POST',
    body: {},
  });
}

/** Reuse outcomes sweep-context for section children roster. */
export async function listSweepChildren(): Promise<SweepContextChild[]> {
  void requireSectionId();
  const ctx = await getSweepContext();
  return ctx.children;
}
