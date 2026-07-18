import { apiFetch } from '../../lib/shared/api/client';
import { getTeacherBandId, getTeacherSectionId } from '../outcomes/api';

export async function getDaily(date: string) {
  return apiFetch<{
    date: string;
    themeOrChapter: string | null;
    mapSliceId: string | null;
  }>(`/planning/${getTeacherSectionId()}/daily?date=${date}`);
}

export async function generateLesson(date: string) {
  return apiFetch<{
    id: string;
    pedagogyType: string;
    theme: string;
    content: unknown;
  }>(`/lessons/${getTeacherSectionId()}/generate`, {
    method: 'POST',
    body: { bandId: getTeacherBandId(), date },
  });
}

export async function markLessonDone(mapSliceId: string) {
  return apiFetch(`/lessons/${getTeacherSectionId()}/mark-done`, {
    method: 'POST',
    body: { mapSliceId },
  });
}
