/**
 * Pure helpers for the 12-week credential programme (P5-API-CERT-01).
 * Quiz scoring is deterministic — no AI. The single observed-teaching-session
 * is human-scored by an assessor, never by the teacher.
 */
export const CERTIFICATION_WEEKS = 12;
export const QUIZ_PASS_THRESHOLD = 0.7;

export type WeekStatus = 'not_started' | 'quiz_passed' | 'quiz_failed';
export type ObservationStatus = 'pending' | 'scheduled' | 'passed' | 'failed';
export type CertificationStatus = 'not_started' | 'in_programme' | 'certified';

export interface WeekProgress {
  week: number;
  status: WeekStatus;
  quizScore: number | null;
}

export function isValidWeek(week: number): boolean {
  return Number.isInteger(week) && week >= 1 && week <= CERTIFICATION_WEEKS;
}

/** Deterministic quiz score as a fraction of correct answers (0..1). */
export function scoreQuiz(correct: number, total: number): number {
  if (total <= 0) return 0;
  const clamped = Math.max(0, Math.min(correct, total));
  return clamped / total;
}

export function isQuizPass(score: number, threshold = QUIZ_PASS_THRESHOLD): boolean {
  return score >= threshold;
}

export function weekStatusFromScore(score: number): WeekStatus {
  return isQuizPass(score) ? 'quiz_passed' : 'quiz_failed';
}

/**
 * Build the full 12-week view, filling weeks with no row as not_started.
 */
export function buildWeekView(rows: WeekProgress[]): WeekProgress[] {
  const byWeek = new Map(rows.map((r) => [r.week, r]));
  const view: WeekProgress[] = [];
  for (let week = 1; week <= CERTIFICATION_WEEKS; week += 1) {
    view.push(byWeek.get(week) ?? { week, status: 'not_started', quizScore: null });
  }
  return view;
}

export function computeCertificationStatus(
  weeks: WeekProgress[],
  observationStatus: ObservationStatus,
): CertificationStatus {
  const view = buildWeekView(weeks);
  const allWeeksPassed = view.every((w) => w.status === 'quiz_passed');
  if (allWeeksPassed && observationStatus === 'passed') {
    return 'certified';
  }
  const anyProgress =
    view.some((w) => w.status !== 'not_started') || observationStatus !== 'pending';
  return anyProgress ? 'in_programme' : 'not_started';
}
