export interface AdminDashboardShape {
  schoolId: string;
  periodStart: string;
  periodEnd: string;
  coverageBySection: Array<{ sectionId: string; sectionName: string; childrenWithFreshOutcomes: number }>;
  sectionsBehindCount: number;
  sectionsTotal: number;
  communicationReplyWithinDayRate: number | null;
  needsSupportBySection: Array<{ sectionId: string; sectionName: string; stalledCount: number }>;
}

const FORBIDDEN_KEYS = [
  'childNames',
  'bandDistributions',
  'ratingDistribution',
  'studentNames',
  'teacherLeague',
];

/** Gravity rule at the UI layer — reject payloads that leak names/distributions. */
export function assertGravitySafe(payload: Record<string, unknown>): boolean {
  for (const key of FORBIDDEN_KEYS) {
    if (key in payload) return false;
  }
  const json = JSON.stringify(payload);
  if (/"childNames"|"bandDistribution"|"ratingDistribution"/i.test(json)) {
    return false;
  }
  return true;
}

export function formatReplyRate(rate: number | null): string {
  if (rate === null) return 'No messages this period';
  return `${Math.round(rate * 100)}% replied within a day`;
}
