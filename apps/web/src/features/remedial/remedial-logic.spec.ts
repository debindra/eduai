import { describe, expect, it } from 'vitest';
import {
  adminOpenLoopSummary,
  assertAdminCountsSafe,
  planStatusLabel,
  teacherPlanLine,
  type AdminOpenLoopCountsShape,
  type RemedialPlanShape,
} from './remedial-logic';

describe('remedial-logic', () => {
  it('labels plan states for teachers', () => {
    expect(
      planStatusLabel({
        id: 'p1',
        childId: 'c1',
        outcomeId: 'o1',
        sectionId: 's1',
        subjectId: null,
        state: 'opened',
        activityRef: null,
      }),
    ).toBe('Opened — needs activity');
  });

  it('shows named child for teacher tracker', () => {
    const plan: RemedialPlanShape = {
      id: 'p1',
      childId: 'c1',
      outcomeId: 'o1',
      sectionId: 's1',
      subjectId: 'math',
      state: 'activity_delivered',
      activityRef: 'a1',
      childName: 'Nisha Rai',
      rollNumber: '1',
    };
    expect(teacherPlanLine(plan)).toBe('#1 Nisha Rai — Activity delivered — await re-assess');
  });

  it('admin summary is counts only and gravity-safe', () => {
    const counts: AdminOpenLoopCountsShape = {
      schoolId: 'school-1',
      openCount: 3,
      byState: { opened: 2, escalated: 1 },
    };
    expect(adminOpenLoopSummary(counts)).toBe('3 open loop(s) (opened: 2, escalated: 1)');
    expect(assertAdminCountsSafe(counts)).toBe(true);
  });

  it('rejects admin payloads that leak names', () => {
    expect(
      assertAdminCountsSafe({
        schoolId: 's',
        openCount: 1,
        byState: {},
        // @ts-expect-error intentional leak for test
        childNames: ['Nisha'],
      }),
    ).toBe(false);
  });
});
