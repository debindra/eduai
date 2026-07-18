import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OutcomesService } from '../outcomes/outcomes.service';
import { RemedialRepository, RemedialService } from './remedial.service';

describe('RemedialService full loop', () => {
  let service: RemedialService;
  let repository: {
    insert: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    listBySection: ReturnType<typeof vi.fn>;
    listOpenForReminders: ReturnType<typeof vi.fn>;
    countOpenBySchool: ReturnType<typeof vi.fn>;
    findChild: ReturnType<typeof vi.fn>;
  };
  let outcomes: { proposeAfterSupport: ReturnType<typeof vi.fn> };

  const basePlan = {
    id: 'plan-1',
    child_id: 'child-1',
    outcome_id: 'outcome-1',
    section_id: 'section-1',
    subject_id: 'subject-math',
    state: 'opened',
    opened_by: 'teacher-1',
    activity_ref: null,
    reminder_count: 0,
    next_reminder_at: '2026-07-20T10:00:00Z',
    reassessed_at: null,
    reassess_outcome_id: null,
    escalated_at: null,
    escalated_to: null,
    closed_at: null,
    closed_reason: null,
  };

  beforeEach(() => {
    repository = {
      insert: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
      listBySection: vi.fn(),
      listOpenForReminders: vi.fn(),
      countOpenBySchool: vi.fn(),
      findChild: vi.fn(),
    };
    outcomes = { proposeAfterSupport: vi.fn() };
    service = new RemedialService(
      repository as unknown as RemedialRepository,
      outcomes as unknown as OutcomesService,
    );
  });

  it('runs open → deliver → reassess → close (pass)', async () => {
    repository.findChild.mockResolvedValue({
      id: 'child-1',
      section_id: 'section-1',
      name: 'Nisha Rai',
      roll_number: '1',
    });
    repository.insert.mockResolvedValue(basePlan);
    const opened = await service.open({
      childId: 'child-1',
      outcomeId: 'outcome-1',
      sectionId: 'section-1',
      subjectId: 'subject-math',
      teacherId: 'teacher-1',
    });
    expect(opened.state).toBe('opened');

    repository.findById.mockResolvedValue(basePlan);
    repository.update.mockResolvedValue({
      ...basePlan,
      state: 'activity_delivered',
      activity_ref: 'activity-xyz',
    });
    const delivered = await service.deliverActivity('plan-1', 'activity-xyz');
    expect(delivered.state).toBe('activity_delivered');
    expect(delivered.activityRef).toBe('activity-xyz');

    repository.findById.mockResolvedValue({
      ...basePlan,
      state: 'activity_delivered',
      activity_ref: 'activity-xyz',
    });
    outcomes.proposeAfterSupport.mockResolvedValue({
      id: 'proposal-1',
      ratingCode: '3',
      attempt: 'after_support',
      state: 'proposed',
    });
    repository.update.mockResolvedValue({
      ...basePlan,
      state: 'reassessed',
      reassess_outcome_id: 'proposal-1',
    });
    const { plan, proposal } = await service.reassess('plan-1', '3', 'teacher-1');
    expect(plan.state).toBe('reassessed');
    expect(proposal.attempt).toBe('after_support');
    expect(outcomes.proposeAfterSupport).toHaveBeenCalled();

    repository.findById.mockResolvedValue({
      ...basePlan,
      state: 'reassessed',
      reassess_outcome_id: 'proposal-1',
    });
    repository.update.mockResolvedValue({
      ...basePlan,
      state: 'closed',
      closed_reason: 'passed_after_support',
    });
    const closed = await service.closeAfterReassess('plan-1', '3');
    expect(closed.state).toBe('closed');
    expect(closed.closedReason).toBe('passed_after_support');
  });

  it('escalates when after_support rating does not pass', async () => {
    repository.findById.mockResolvedValue({ ...basePlan, state: 'reassessed' });
    repository.update.mockResolvedValue({
      ...basePlan,
      state: 'escalated',
      escalated_to: 'upcharatmak',
    });
    const escalated = await service.closeAfterReassess('plan-1', '2');
    expect(escalated.state).toBe('escalated');
    expect(escalated.escalatedTo).toBe('upcharatmak');
  });

  it('admin open-loop counts never include child names', async () => {
    repository.countOpenBySchool.mockResolvedValue({
      openCount: 2,
      byState: { opened: 1, activity_delivered: 1 },
    });
    const counts = await service.adminOpenLoopCounts('school-1');
    expect(counts).toEqual({
      schoolId: 'school-1',
      openCount: 2,
      byState: { opened: 1, activity_delivered: 1 },
    });
    expect(JSON.stringify(counts)).not.toMatch(/name|Nisha|childNames/i);
  });
});
