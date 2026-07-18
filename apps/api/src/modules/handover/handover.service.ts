import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { PacingService } from '../pacing/pacing.service';

export type ChildHandoverTag = 'confirmed' | 'watch' | 'confirm';

@Injectable()
export class HandoverRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private client() {
    const c = this.supabase.getClient();
    if (!c) throw new Error('Supabase is not configured');
    return c;
  }

  async listChildren(sectionId: string) {
    const { data, error } = await this.client()
      .from('children')
      .select('id, name, roll_number')
      .eq('section_id', sectionId)
      .eq('status', 'active');
    if (error) throw error;
    return data ?? [];
  }

  async listConfirmedOutcomes(sectionId: string) {
    const { data, error } = await this.client()
      .from('student_outcomes')
      .select('id, child_id, outcome_id, rating_code, confirmed_at, updated_at')
      .eq('section_id', sectionId)
      .eq('state', 'confirmed');
    if (error) throw error;
    return data ?? [];
  }

  async listLessonDraftRefs(sectionId: string) {
    const { data, error } = await this.client()
      .from('lesson_drafts')
      .select('id, map_slice_id, pedagogy_type')
      .eq('section_id', sectionId);
    if (error) throw error;
    return data ?? [];
  }

  async listOpenThreads(sectionId: string) {
    const { data: children } = await this.client()
      .from('children')
      .select('id')
      .eq('section_id', sectionId);
    const childIds = (children ?? []).map((c) => c.id as string);
    if (childIds.length === 0) return [];
    const { data, error } = await this.client()
      .from('message_log')
      .select('id, thread_id, child_id, intent_route, approval_status')
      .in('child_id', childIds)
      .eq('approval_status', 'draft');
    if (error) throw error;
    return data ?? [];
  }

  async insertPack(row: {
    section_id: string;
    departing_teacher_id: string;
    incoming_teacher_id: string | null;
    snapshot: unknown;
  }) {
    const { data, error } = await this.client()
      .from('handover_pack')
      .insert(row)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async findLatest(sectionId: string) {
    const { data, error } = await this.client()
      .from('handover_pack')
      .select('*')
      .eq('section_id', sectionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
}

/** Tag from recency of latest confirmed outcome — documented heuristic. */
export function tagChildFromRecency(
  latestConfirmedAt: string | null,
  now = new Date(),
): ChildHandoverTag {
  if (!latestConfirmedAt) return 'confirm';
  const days =
    (now.getTime() - new Date(latestConfirmedAt).getTime()) / (24 * 60 * 60 * 1000);
  if (days <= 30) return 'confirmed';
  if (days <= 90) return 'watch';
  return 'confirm';
}

@Injectable()
export class HandoverService {
  constructor(
    private readonly repository: HandoverRepository,
    private readonly pacing: PacingService,
  ) {}

  async assemble(
    sectionId: string,
    departingTeacherId: string,
    incomingTeacherId?: string | null,
  ) {
    const [children, outcomes, lessonDrafts, openThreads, pacing] = await Promise.all([
      this.repository.listChildren(sectionId),
      this.repository.listConfirmedOutcomes(sectionId),
      this.repository.listLessonDraftRefs(sectionId),
      this.repository.listOpenThreads(sectionId),
      this.pacing.getPacing(sectionId),
    ]);

    const latestByChild = new Map<string, string>();
    for (const o of outcomes) {
      const childId = o.child_id as string;
      const at = (o.confirmed_at as string) ?? (o.updated_at as string);
      const prev = latestByChild.get(childId);
      if (!prev || new Date(at) > new Date(prev)) {
        latestByChild.set(childId, at);
      }
    }

    const perChild = children.map((c) => {
      const childId = c.id as string;
      const childOutcomes = outcomes.filter((o) => o.child_id === childId);
      return {
        childId,
        rollNumber: c.roll_number as string | null,
        // name included in teacher-facing handover snapshot (not admin gravity)
        name: c.name as string,
        tag: tagChildFromRecency(latestByChild.get(childId) ?? null),
        outcomeHistory: childOutcomes.map((o) => ({
          outcomeId: o.outcome_id as string,
          ratingCode: o.rating_code as string | null,
          confirmedAt: o.confirmed_at as string | null,
        })),
      };
    });

    const snapshot = {
      sectionId,
      assembledAt: new Date().toISOString(),
      classSummary: {
        childCount: children.length,
        confirmedOutcomeCount: outcomes.length,
      },
      pacing: {
        state: pacing.state,
        gapTeachingDays: pacing.gapTeachingDays,
      },
      lessonDraftRefs: lessonDrafts.map((d) => ({
        id: d.id as string,
        mapSliceId: d.map_slice_id as string,
        pedagogyType: d.pedagogy_type as string,
      })),
      openThreads: openThreads.map((t) => ({
        id: t.id as string,
        threadId: t.thread_id as string,
        childId: t.child_id as string,
      })),
      perChild,
      // Explicit: coach_messages never joined — table has no child_id.
      excluded: ['coach_messages'],
    };

    const pack = await this.repository.insertPack({
      section_id: sectionId,
      departing_teacher_id: departingTeacherId,
      incoming_teacher_id: incomingTeacherId ?? null,
      snapshot,
    });

    return mapPack(pack);
  }

  async getLatest(sectionId: string) {
    const pack = await this.repository.findLatest(sectionId);
    if (!pack) throw new NotFoundException('No handover pack for section');
    return mapPack(pack);
  }
}

function mapPack(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    sectionId: row.section_id as string,
    departingTeacherId: row.departing_teacher_id as string,
    incomingTeacherId: (row.incoming_teacher_id as string | null) ?? null,
    snapshot: row.snapshot,
    createdAt: row.created_at as string | undefined,
  };
}
