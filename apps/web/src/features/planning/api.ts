import { apiFetch } from '../../lib/shared/api/client';
import { getTeacherSectionId } from '../outcomes/api';

export interface WeeklyPlanDay {
  date: string;
  teachingDayIndex: number;
  themeOrChapter: string | null;
  mapSliceId: string | null;
  overridden: boolean;
  notes: string | null;
}

export interface WeeklyPlanResponse {
  sectionId: string;
  weekStart: string;
  days: WeeklyPlanDay[];
}

export async function getWeekly(weekStart?: string) {
  const q = weekStart ? `?weekStart=${weekStart}` : '';
  return apiFetch<WeeklyPlanResponse>(`/planning/${getTeacherSectionId()}/weekly${q}`);
}

export async function adjustWeekly(dayDate: string, themeOrChapter: string, notes?: string) {
  return apiFetch<WeeklyPlanResponse>(`/planning/${getTeacherSectionId()}/weekly/adjust`, {
    method: 'POST',
    body: { dayDate, themeOrChapter, notes },
  });
}
