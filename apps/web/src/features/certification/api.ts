import { apiFetch } from '../../lib/shared/api/client';
import type { CertificationView } from './certification-logic';

export async function getMyCertification() {
  return apiFetch<CertificationView>('/certification/me');
}

export async function submitWeeklyQuiz(week: number, correct: number, total: number) {
  return apiFetch<CertificationView>(`/certification/me/week/${week}/quiz`, {
    method: 'POST',
    body: { correct, total },
  });
}
