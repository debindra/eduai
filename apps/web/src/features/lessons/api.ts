import { apiFetch } from '../../lib/shared/api/client';
import {
  requireBandId,
  requireSectionId,
} from '../../lib/shared/stores/teacher-context';

export async function getDaily(date: string) {
  return apiFetch<{
    date: string;
    themeOrChapter: string | null;
    mapSliceId: string | null;
  }>(`/planning/${requireSectionId()}/daily?date=${date}`);
}

export async function generateLesson(date: string) {
  return apiFetch<{
    id: string;
    pedagogyType: string;
    theme: string;
    content: unknown;
  }>(`/lessons/${requireSectionId()}/generate`, {
    method: 'POST',
    body: { bandId: requireBandId(), date },
  });
}

export async function markLessonDone(mapSliceId: string) {
  return apiFetch(`/lessons/${requireSectionId()}/mark-done`, {
    method: 'POST',
    body: { mapSliceId },
  });
}
