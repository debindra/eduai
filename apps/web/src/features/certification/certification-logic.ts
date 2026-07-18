export type WeekStatus = 'not_started' | 'quiz_passed' | 'quiz_failed';
export type ObservationStatus = 'pending' | 'scheduled' | 'passed' | 'failed';
export type CertificationStatus = 'not_started' | 'in_programme' | 'certified';

export interface WeekProgress {
  week: number;
  status: WeekStatus;
  quizScore: number | null;
}

export interface CertificationView {
  teacherId: string;
  status: CertificationStatus;
  weeks: WeekProgress[];
  observation: { status: ObservationStatus; score: number | null };
}

const STATUS_LABELS: Record<CertificationStatus, string> = {
  not_started: 'Not started',
  in_programme: 'In programme',
  certified: 'Certified',
};

const WEEK_LABELS: Record<WeekStatus, string> = {
  not_started: 'Not started',
  quiz_passed: 'Passed',
  quiz_failed: 'Retry needed',
};

const OBSERVATION_LABELS: Record<ObservationStatus, string> = {
  pending: 'Awaiting assessor',
  scheduled: 'Scheduled',
  passed: 'Passed',
  failed: 'Retry needed',
};

export function certificationStatusLabel(status: CertificationStatus): string {
  return STATUS_LABELS[status];
}

export function weekStatusLabel(status: WeekStatus): string {
  return WEEK_LABELS[status];
}

export function observationStatusLabel(status: ObservationStatus): string {
  return OBSERVATION_LABELS[status];
}

/** e.g. "3 / 12 weeks passed". */
export function progressSummary(view: CertificationView): string {
  const passed = view.weeks.filter((w) => w.status === 'quiz_passed').length;
  return `${passed} / ${view.weeks.length} weeks passed`;
}
