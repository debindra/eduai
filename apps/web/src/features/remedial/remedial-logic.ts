export type RemedialPlanState =
  | 'opened'
  | 'activity_delivered'
  | 'reassessed'
  | 'escalated'
  | 'closed';

export interface RemedialPlanShape {
  id: string;
  childId: string;
  outcomeId: string;
  sectionId: string;
  subjectId: string | null;
  state: RemedialPlanState;
  activityRef: string | null;
  childName?: string | null;
  rollNumber?: string | null;
}

export interface RemedialListShape {
  sectionId: string;
  plans: RemedialPlanShape[];
}

export interface AdminOpenLoopCountsShape {
  schoolId: string;
  openCount: number;
  byState: Record<string, number>;
}

export function planStatusLabel(plan: RemedialPlanShape): string {
  const labels: Record<RemedialPlanState, string> = {
    opened: 'Opened — needs activity',
    activity_delivered: 'Activity delivered — await re-assess',
    reassessed: 'Re-assessed',
    escalated: 'Escalated to upcharatmak',
    closed: 'Closed',
  };
  return labels[plan.state];
}

export function teacherPlanLine(plan: RemedialPlanShape): string {
  const name = plan.childName ?? plan.childId;
  const roll = plan.rollNumber ? `#${plan.rollNumber} ` : '';
  return `${roll}${name} — ${planStatusLabel(plan)}`;
}

export function adminOpenLoopSummary(counts: AdminOpenLoopCountsShape): string {
  const parts = Object.entries(counts.byState)
    .map(([state, n]) => `${state}: ${n}`)
    .join(', ');
  return `${counts.openCount} open loop(s)${parts ? ` (${parts})` : ''}`;
}

/** Gravity: admin payloads must not carry child names. */
export function assertAdminCountsSafe(payload: AdminOpenLoopCountsShape): boolean {
  const json = JSON.stringify(payload);
  if (/childName|studentName|bandDistribution|ratingDistribution/i.test(json)) {
    return false;
  }
  return typeof payload.openCount === 'number';
}
