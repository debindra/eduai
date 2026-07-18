import { apiFetch } from '../../lib/shared/api/client';
import { getTeacherSectionId } from '../outcomes/api';
import type { PacingApiState } from './pacing-logic';

export async function getPacing() {
  return apiFetch<{
    state: PacingApiState;
    gapTeachingDays: number;
    teachingDaysRemaining: number;
    plannedIndex: number;
    actualDone: number;
  }>(`/pacing/${getTeacherSectionId()}`);
}
