import { apiFetch } from '../../lib/shared/api/client';
import { getTeacherSectionId } from '../outcomes/api';

export async function getWeekly(weekStart?: string) {
  const q = weekStart ? `?weekStart=${weekStart}` : '';
  return apiFetch<{
    weekStart: string;
    days: Array<{ date: string; themeOrChapter: string | null; overridden: boolean }>;
  }>(`/planning/${getTeacherSectionId()}/weekly${q}`);
}

export async function adjustWeekly(dayDate: string, themeOrChapter: string) {
  return apiFetch(`/planning/${getTeacherSectionId()}/weekly/adjust`, {
    method: 'POST',
    body: { dayDate, themeOrChapter },
  });
}
