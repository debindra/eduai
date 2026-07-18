import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { OutcomesService } from '../outcomes/outcomes.service';
import {
  canTransition,
  computeDueReminders,
  isPassingRating,
  nextReminderAt,
  shouldEscalate,
  type RemedialPlanRow,
  type RemedialState,
} from './remedial-logic';

function mapPlan(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    childId: row.child_id as string,
    outcomeId: row.outcome_id as string,
    sectionId: row.section_id as string,
    subjectId: (row.subject_id as string | null) ?? null,
    state: row.state as RemedialState,
    openedBy: (row.opened_by as string | null) ?? null,
    activityRef: (row.activity_ref as string | null) ?? null,
    reminderCount: (row.reminder_count as number) ?? 0,
    nextReminderAt: (row.next_reminder_at as string | null) ?? null,
    reassessedAt: (row.reassessed_at as string | null) ?? null,
    reassessOutcomeId: (row.reassess_outcome_id as string | null) ?? null,
    escalatedAt: (row.escalated_at as string | null) ?? null,
    escalatedTo: (row.escalated_to as string | null) ?? null,
    closedAt: (row.closed_at as string | null) ?? null,
    closedReason: (row.closed_reason as string | null) ?? null,
  };
}

@Injectable()
export class RemedialRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private client() {
    const c = this.supabase.getClient();
    if (!c) throw new Error('Supabase is not configured');
    return c;
  }

  async insert(row: {
    child_id: string;
    outcome_id: string;
    section_id: string;
    subject_id: string | null;
    opened_by: string | null;
    next_reminder_at: string;
  }) {
    const { data, error } = await this.client()
      .from('remedial_plans')
      .insert({ ...row, state: 'opened' })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async findById(id: string) {
    const { data, error } = await this.client()
      .from('remedial_plans')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async update(id: string, patch: Record<string, unknown>) {
    const { data, error } = await this.client()
      .from('remedial_plans')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async listBySection(sectionId: string) {
    const { data, error } = await this.client()
      .from('remedial_plans')
      .select('*')
      .eq('section_id', sectionId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async listOpenForReminders() {
    const { data, error } = await this.client()
      .from('remedial_plans')
      .select('*')
      .in('state', ['opened', 'activity_delivered'])
      .not('next_reminder_at', 'is', null);
    if (error) throw error;
    return data ?? [];
  }

  async countOpenBySchool(schoolId: string) {
    const { data: sections, error: sErr } = await this.client()
      .from('sections')
      .select('id')
      .eq('school_id', schoolId);
    if (sErr) throw sErr;
    const sectionIds = (sections ?? []).map((s) => s.id as string);
    if (sectionIds.length === 0) {
      return { openCount: 0, byState: {} as Record<string, number> };
    }
    const { data, error } = await this.client()
      .from('remedial_plans')
      .select('id, state, section_id')
      .in('section_id', sectionIds)
      .neq('state', 'closed');
    if (error) throw error;
    const byState: Record<string, number> = {};
    for (const row of data ?? []) {
      const st = row.state as string;
      byState[st] = (byState[st] ?? 0) + 1;
    }
    return { openCount: (data ?? []).length, byState };
  }

  async findChild(childId: string) {
    const { data, error } = await this.client()
      .from('children')
      .select('id, name, section_id, roll_number')
      .eq('id', childId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
}

@Injectable()
export class RemedialService {
  constructor(
    private readonly repository: RemedialRepository,
    private readonly outcomes: OutcomesService,
  ) {}

  async open(input: {
    childId: string;
    outcomeId: string;
    sectionId: string;
    subjectId: string | null;
    teacherId: string | null;
  }) {
    const child = await this.repository.findChild(input.childId);
    if (!child) throw new NotFoundException('Child not found');
    if (child.section_id !== input.sectionId) {
      throw new BadRequestException('Child does not belong to section');
    }
    const row = await this.repository.insert({
      child_id: input.childId,
      outcome_id: input.outcomeId,
      section_id: input.sectionId,
      subject_id: input.subjectId,
      opened_by: input.teacherId,
      next_reminder_at: nextReminderAt().toISOString(),
    });
    return mapPlan(row);
  }

  async deliverActivity(planId: string, activityRef: string) {
    const existing = await this.requirePlan(planId);
    if (!canTransition(existing.state as RemedialState, 'activity_delivered')) {
      throw new BadRequestException(`Cannot deliver activity from state ${existing.state}`);
    }
    const row = await this.repository.update(planId, {
      state: 'activity_delivered',
      activity_ref: activityRef,
      next_reminder_at: nextReminderAt().toISOString(),
    });
    return mapPlan(row);
  }

  /**
   * Re-assess: proposes an after_support outcome (never confirms).
   * Teacher must confirm via OutcomesService separately.
   */
  async reassess(
    planId: string,
    ratingCode: string,
    teacherId: string | null,
    note?: string,
  ) {
    const existing = await this.requirePlan(planId);
    if (!canTransition(existing.state as RemedialState, 'reassessed')) {
      throw new BadRequestException(`Cannot reassess from state ${existing.state}`);
    }
    const proposal = await this.outcomes.proposeAfterSupport(
      existing.section_id as string,
      (existing.subject_id as string | null) ?? null,
      existing.child_id as string,
      existing.outcome_id as string,
      ratingCode,
      teacherId,
      note,
    );
    const row = await this.repository.update(planId, {
      state: 'reassessed',
      reassessed_at: new Date().toISOString(),
      reassess_outcome_id: proposal.id,
      next_reminder_at: null,
    });
    return { plan: mapPlan(row), proposal };
  }

  async closeAfterReassess(planId: string, confirmedRatingCode: string) {
    const existing = await this.requirePlan(planId);
    if (existing.state !== 'reassessed') {
      throw new BadRequestException('Plan must be reassessed before close/escalate');
    }
    if (isPassingRating(confirmedRatingCode)) {
      return this.close(planId, 'passed_after_support');
    }
    return this.escalate(planId, 'upcharatmak');
  }

  async escalate(planId: string, escalatedTo = 'upcharatmak') {
    const existing = await this.requirePlan(planId);
    if (!canTransition(existing.state as RemedialState, 'escalated')) {
      throw new BadRequestException(`Cannot escalate from state ${existing.state}`);
    }
    const row = await this.repository.update(planId, {
      state: 'escalated',
      escalated_at: new Date().toISOString(),
      escalated_to: escalatedTo,
      next_reminder_at: null,
    });
    return mapPlan(row);
  }

  async close(planId: string, reason: string) {
    const existing = await this.requirePlan(planId);
    if (!canTransition(existing.state as RemedialState, 'closed')) {
      throw new BadRequestException(`Cannot close from state ${existing.state}`);
    }
    const row = await this.repository.update(planId, {
      state: 'closed',
      closed_at: new Date().toISOString(),
      closed_reason: reason,
      next_reminder_at: null,
    });
    return mapPlan(row);
  }

  async listForSection(sectionId: string, includeNames: boolean) {
    const rows = await this.repository.listBySection(sectionId);
    const plans = [];
    for (const row of rows) {
      const plan = mapPlan(row);
      if (includeNames) {
        const child = await this.repository.findChild(plan.childId);
        plans.push({
          ...plan,
          childName: child?.name ?? null,
          rollNumber: child?.roll_number ?? null,
        });
      } else {
        plans.push(plan);
      }
    }
    return { sectionId, plans };
  }

  /** Admin gravity: counts only — never child names. */
  async adminOpenLoopCounts(schoolId: string) {
    const { openCount, byState } = await this.repository.countOpenBySchool(schoolId);
    return {
      schoolId,
      openCount,
      byState,
    };
  }

  /** Tick endpoint: advance due reminders; escalate when exhausted. */
  async runReminders(now: Date = new Date()) {
    const rows = await this.repository.listOpenForReminders();
    const mapped: RemedialPlanRow[] = rows.map((r) => ({
      id: r.id as string,
      state: r.state as RemedialState,
      reminderCount: (r.reminder_count as number) ?? 0,
      nextReminderAt: (r.next_reminder_at as string | null) ?? null,
      activityRef: (r.activity_ref as string | null) ?? null,
    }));
    const due = computeDueReminders(mapped, now);
    const results: Array<{ planId: string; action: string }> = [];
    for (const plan of due) {
      const nextCount = plan.reminderCount + 1;
      if (shouldEscalate({ ...plan, reminderCount: nextCount })) {
        await this.escalate(plan.id, 'upcharatmak');
        results.push({ planId: plan.id, action: 'escalated' });
      } else {
        await this.repository.update(plan.id, {
          reminder_count: nextCount,
          next_reminder_at: nextReminderAt(now).toISOString(),
        });
        results.push({ planId: plan.id, action: 'reminded' });
      }
    }
    return { processed: results.length, results };
  }

  private async requirePlan(planId: string) {
    const existing = await this.repository.findById(planId);
    if (!existing) throw new NotFoundException('Remedial plan not found');
    return existing;
  }
}
