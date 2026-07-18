/**
 * Pure remedial reminder / escalation helpers.
 * Quiet-hours: no reminders between 20:00–06:00 local (UTC+5:45 Nepal).
 */

export type RemedialState =
  | 'opened'
  | 'activity_delivered'
  | 'reassessed'
  | 'escalated'
  | 'closed';

export interface RemedialPlanRow {
  id: string;
  state: RemedialState;
  reminderCount: number;
  nextReminderAt: string | null;
  activityRef: string | null;
}

export const MAX_REMINDERS_BEFORE_ESCALATE = 3;
export const REMINDER_INTERVAL_HOURS = 48;

const QUIET_START_HOUR = 20;
const QUIET_END_HOUR = 6;
const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

export function isQuietHours(now: Date = new Date()): boolean {
  const nepal = new Date(now.getTime() + NEPAL_OFFSET_MS);
  const hour = nepal.getUTCHours();
  return hour >= QUIET_START_HOUR || hour < QUIET_END_HOUR;
}

export function nextReminderAt(
  from: Date = new Date(),
  intervalHours = REMINDER_INTERVAL_HOURS,
): Date {
  let candidate = new Date(from.getTime() + intervalHours * 60 * 60 * 1000);
  // If landing in quiet hours, push to 06:00 Nepal next morning
  while (isQuietHours(candidate)) {
    const nepal = new Date(candidate.getTime() + NEPAL_OFFSET_MS);
    const hour = nepal.getUTCHours();
    if (hour >= QUIET_START_HOUR) {
      // push to next day 06:00 Nepal
      const daysToAdd = 1;
      const targetNepalUtc =
        Date.UTC(
          nepal.getUTCFullYear(),
          nepal.getUTCMonth(),
          nepal.getUTCDate() + daysToAdd,
          QUIET_END_HOUR,
          0,
          0,
        ) - NEPAL_OFFSET_MS;
      candidate = new Date(targetNepalUtc);
    } else {
      // before 06:00 — same day 06:00 Nepal
      const targetNepalUtc =
        Date.UTC(
          nepal.getUTCFullYear(),
          nepal.getUTCMonth(),
          nepal.getUTCDate(),
          QUIET_END_HOUR,
          0,
          0,
        ) - NEPAL_OFFSET_MS;
      candidate = new Date(targetNepalUtc);
    }
  }
  return candidate;
}

export function shouldEscalate(plan: RemedialPlanRow): boolean {
  if (plan.state === 'escalated' || plan.state === 'closed') return false;
  if (plan.state === 'reassessed') return true; // caller decides pass vs escalate after reassess
  return plan.reminderCount >= MAX_REMINDERS_BEFORE_ESCALATE;
}

export function computeDueReminders(
  plans: RemedialPlanRow[],
  now: Date = new Date(),
): RemedialPlanRow[] {
  if (isQuietHours(now)) return [];
  return plans.filter((p) => {
    if (p.state === 'closed' || p.state === 'escalated') return false;
    if (p.state !== 'opened' && p.state !== 'activity_delivered') return false;
    if (!p.nextReminderAt) return false;
    return new Date(p.nextReminderAt).getTime() <= now.getTime();
  });
}

export function isPassingRating(ratingCode: string, passThreshold = 3): boolean {
  const n = Number(ratingCode);
  if (!Number.isFinite(n)) return false;
  return n >= passThreshold;
}

export function canTransition(from: RemedialState, to: RemedialState): boolean {
  const allowed: Record<RemedialState, RemedialState[]> = {
    opened: ['activity_delivered', 'escalated', 'closed'],
    activity_delivered: ['reassessed', 'escalated', 'closed'],
    reassessed: ['closed', 'escalated'],
    escalated: ['closed'],
    closed: [],
  };
  return allowed[from].includes(to);
}
