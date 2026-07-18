import { describe, expect, it } from 'vitest';
import {
  canTransition,
  computeDueReminders,
  isPassingRating,
  isQuietHours,
  nextReminderAt,
  shouldEscalate,
  type RemedialPlanRow,
} from './remedial-logic';

describe('remedial-logic', () => {
  it('allows valid state transitions only', () => {
    expect(canTransition('opened', 'activity_delivered')).toBe(true);
    expect(canTransition('activity_delivered', 'reassessed')).toBe(true);
    expect(canTransition('reassessed', 'closed')).toBe(true);
    expect(canTransition('reassessed', 'escalated')).toBe(true);
    expect(canTransition('escalated', 'closed')).toBe(true);
    expect(canTransition('closed', 'opened')).toBe(false);
    expect(canTransition('opened', 'reassessed')).toBe(false);
  });

  it('escalates after max reminders', () => {
    const plan: RemedialPlanRow = {
      id: 'p1',
      state: 'activity_delivered',
      reminderCount: 3,
      nextReminderAt: null,
      activityRef: 'act-1',
    };
    expect(shouldEscalate(plan)).toBe(true);
  });

  it('does not escalate closed plans', () => {
    expect(
      shouldEscalate({
        id: 'p1',
        state: 'closed',
        reminderCount: 10,
        nextReminderAt: null,
        activityRef: null,
      }),
    ).toBe(false);
  });

  it('computes due reminders outside quiet hours', () => {
    // 10:00 UTC ≈ 15:45 Nepal — not quiet
    const now = new Date('2026-07-18T10:00:00Z');
    expect(isQuietHours(now)).toBe(false);
    const plans: RemedialPlanRow[] = [
      {
        id: 'due',
        state: 'activity_delivered',
        reminderCount: 1,
        nextReminderAt: '2026-07-18T09:00:00Z',
        activityRef: 'a',
      },
      {
        id: 'future',
        state: 'activity_delivered',
        reminderCount: 0,
        nextReminderAt: '2026-07-19T10:00:00Z',
        activityRef: 'a',
      },
      {
        id: 'closed',
        state: 'closed',
        reminderCount: 0,
        nextReminderAt: '2026-07-18T09:00:00Z',
        activityRef: 'a',
      },
    ];
    const due = computeDueReminders(plans, now);
    expect(due.map((p) => p.id)).toEqual(['due']);
  });

  it('suppresses reminders during quiet hours', () => {
    // 16:00 UTC ≈ 21:45 Nepal — quiet
    const now = new Date('2026-07-18T16:00:00Z');
    expect(isQuietHours(now)).toBe(true);
    const due = computeDueReminders(
      [
        {
          id: 'due',
          state: 'opened',
          reminderCount: 0,
          nextReminderAt: '2026-07-18T09:00:00Z',
          activityRef: null,
        },
      ],
      now,
    );
    expect(due).toEqual([]);
  });

  it('schedules next reminder outside quiet hours', () => {
    const from = new Date('2026-07-18T10:00:00Z');
    const next = nextReminderAt(from, 48);
    expect(isQuietHours(next)).toBe(false);
  });

  it('treats rating >= 3 as passing', () => {
    expect(isPassingRating('3')).toBe(true);
    expect(isPassingRating('4')).toBe(true);
    expect(isPassingRating('2')).toBe(false);
  });
});
