import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { AiOrchestrationService } from '../ai-orchestration/ai-orchestration.service';
import {
  resolveObservationAgainstRoster,
  type SectionChild,
} from './mapper-guards';

const TOP_BAND_CODES = new Set(['secure', 'can_do', '4']);

@Injectable()
export class OutcomesRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private client() {
    const c = this.supabase.getClient();
    if (!c) throw new Error('Supabase is not configured');
    return c;
  }

  async listChildren(sectionId: string): Promise<SectionChild[]> {
    const { data, error } = await this.client()
      .from('children')
      .select('id, name, roll_number')
      .eq('section_id', sectionId)
      .eq('status', 'active');
    if (error) throw error;
    return (data ?? []).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      rollNumber: r.roll_number as string,
    }));
  }

  async insertProposed(row: {
    child_id: string;
    outcome_id: string;
    section_id: string;
    subject_id: string | null;
    band_code: string | null;
    rating_code: string | null;
    recorded_by: string | null;
    evidence_note: string | null;
    attempt?: 'regular' | 'after_support';
  }) {
    const { data, error } = await this.client()
      .from('student_outcomes')
      .insert({
        ...row,
        state: 'proposed',
        attempt: row.attempt ?? 'regular',
      })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async findById(id: string) {
    const { data, error } = await this.client()
      .from('student_outcomes')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async confirm(id: string, teacherId: string, edits?: { rating_code?: string; evidence_note?: string }) {
    const { data, error } = await this.client()
      .from('student_outcomes')
      .update({
        state: 'confirmed',
        confirmed_by: teacherId,
        confirmed_at: new Date().toISOString(),
        ...(edits?.rating_code ? { rating_code: edits.rating_code } : {}),
        ...(edits?.evidence_note ? { evidence_note: edits.evidence_note } : {}),
      })
      .eq('id', id)
      .eq('state', 'proposed')
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async listProposed(sectionId: string) {
    const { data, error } = await this.client()
      .from('student_outcomes')
      .select('*')
      .eq('section_id', sectionId)
      .eq('state', 'proposed');
    if (error) throw error;
    return data ?? [];
  }

  async listConfirmedForPeriod(sectionId: string, start: string, end: string) {
    const { data, error } = await this.client()
      .from('student_outcomes')
      .select('*')
      .eq('section_id', sectionId)
      .eq('state', 'confirmed')
      .gte('confirmed_at', start)
      .lte('confirmed_at', end);
    if (error) throw error;
    return data ?? [];
  }

  async listStalled(sectionId: string, olderThanIso: string) {
    const { data, error } = await this.client()
      .from('student_outcomes')
      .select('id, child_id, outcome_id, updated_at, rating_code')
      .eq('section_id', sectionId)
      .eq('state', 'confirmed')
      .lt('updated_at', olderThanIso);
    if (error) throw error;
    return data ?? [];
  }

  async findSectionBandId(sectionId: string): Promise<string | null> {
    const { data, error } = await this.client()
      .from('sections')
      .select('band_id')
      .eq('id', sectionId)
      .maybeSingle();
    if (error) throw error;
    return (data?.band_id as string | undefined) ?? null;
  }

  /**
   * Active milestones/outcomes for a band. When subjectId is null (pre-primary),
   * returns outcomes with subject_id IS NULL. When set, filters to that subject.
   * Ordered by sort_order only — never by rating across children.
   */
  async listOutcomesForBand(bandId: string, subjectId: string | null) {
    let query = this.client()
      .from('outcomes')
      .select('id, code, statement_en')
      .eq('band_id', bandId)
      .order('sort_order', { ascending: true });
    if (subjectId === null) {
      query = query.is('subject_id', null);
    } else {
      query = query.eq('subject_id', subjectId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }
}

@Injectable()
export class OutcomesService {
  constructor(
    private readonly repository: OutcomesRepository,
    private readonly ai: AiOrchestrationService,
  ) {}

  /** Batch sweep — propose only. */
  async proposeBatchSweep(
    sectionId: string,
    subjectId: string | null,
    items: Array<{ childId: string; outcomeId: string; ratingCode: string; note?: string }>,
    teacherId: string | null,
  ) {
    const created = [];
    for (const item of items) {
      if (TOP_BAND_CODES.has(item.ratingCode.toLowerCase())) {
        throw new BadRequestException('Cannot jump to top band from one sighting in batch sweep');
      }
      await this.validateChildBelongsToSection(item.childId, sectionId);
      const row = await this.repository.insertProposed({
        child_id: item.childId,
        outcome_id: item.outcomeId,
        section_id: sectionId,
        subject_id: subjectId,
        band_code: null,
        rating_code: item.ratingCode,
        recorded_by: teacherId,
        evidence_note: item.note ?? null,
      });
      created.push(row);
    }
    return { proposed: created.map(mapOutcome) };
  }

  /** Carry-forward — propose from prior rating, never confirm. */
  async proposeCarryForward(
    sectionId: string,
    subjectId: string | null,
    childId: string,
    outcomeId: string,
    priorRating: string,
    teacherId: string | null,
  ) {
    if (TOP_BAND_CODES.has(priorRating.toLowerCase())) {
      throw new BadRequestException('Carry-forward cannot auto-propose top band');
    }
    await this.validateChildBelongsToSection(childId, sectionId);
    const row = await this.repository.insertProposed({
      child_id: childId,
      outcome_id: outcomeId,
      section_id: sectionId,
      subject_id: subjectId,
      band_code: null,
      rating_code: priorRating,
      recorded_by: teacherId,
      evidence_note: 'carry-forward proposal',
    });
    return mapOutcome(row);
  }

  /** Voice/text mapper — AI propose only; never writes confirmed. */
  async proposeFromObservation(
    sectionId: string,
    subjectId: string | null,
    bandId: string,
    observationText: string,
    outcomeId: string,
    teacherId: string | null,
  ) {
    const children = await this.repository.listChildren(sectionId);
    const resolved = resolveObservationAgainstRoster(observationText, children, 'emerging');

    if (resolved.routeToAttendance) {
      return {
        kind: 'attendance' as const,
        message: 'Observation routed to attendance — no outcome proposed',
      };
    }

    if (resolved.nameAmbiguous || !resolved.childId) {
      return {
        kind: 'ambiguous' as const,
        rollNumberCandidates: resolved.rollNumberCandidates,
        message: resolved.blockedReason ?? 'Pick a roll number',
      };
    }

    // AI draft for evidence note — propose path only
    await this.ai.orchestrate({
      featureId: 'outcome_mapper',
      bandId,
      variables: {
        observation_text: observationText,
        outcomes_json: JSON.stringify([{ outcomeId }]),
      },
      mapper: {
        observationText,
        ratingCode: resolved.suggestedRating ?? 'emerging',
        childNameAmbiguous: false,
      },
    });

    const row = await this.repository.insertProposed({
      child_id: resolved.childId,
      outcome_id: outcomeId,
      section_id: sectionId,
      subject_id: subjectId,
      band_code: null,
      rating_code: resolved.suggestedRating ?? 'emerging',
      recorded_by: teacherId,
      evidence_note: observationText,
    });

    return { kind: 'proposed' as const, outcome: mapOutcome(row) };
  }

  /** Assessment activity rubric → propose. */
  async proposeFromAssessmentActivity(
    sectionId: string,
    subjectId: string | null,
    childId: string,
    outcomeId: string,
    ratingCode: string,
    teacherId: string | null,
    note?: string,
  ) {
    if (TOP_BAND_CODES.has(ratingCode.toLowerCase())) {
      throw new BadRequestException('Assessment activity cannot jump to top band from one sighting');
    }
    await this.validateChildBelongsToSection(childId, sectionId);
    const row = await this.repository.insertProposed({
      child_id: childId,
      outcome_id: outcomeId,
      section_id: sectionId,
      subject_id: subjectId,
      band_code: null,
      rating_code: ratingCode,
      recorded_by: teacherId,
      evidence_note: note ?? 'assessment activity',
    });
    return mapOutcome(row);
  }

  /**
   * After-support re-assessment — propose only (never confirm).
   * Inserts a new row with attempt=after_support; never mutates a regular pass.
   */
  async proposeAfterSupport(
    sectionId: string,
    subjectId: string | null,
    childId: string,
    outcomeId: string,
    ratingCode: string,
    teacherId: string | null,
    note?: string,
  ) {
    if (TOP_BAND_CODES.has(ratingCode.toLowerCase())) {
      throw new BadRequestException(
        'After-support propose cannot jump to top band from one sighting',
      );
    }
    await this.validateChildBelongsToSection(childId, sectionId);
    const row = await this.repository.insertProposed({
      child_id: childId,
      outcome_id: outcomeId,
      section_id: sectionId,
      subject_id: subjectId,
      band_code: null,
      rating_code: ratingCode,
      recorded_by: teacherId,
      evidence_note: note ?? 'after_support re-assessment',
      attempt: 'after_support',
    });
    return mapOutcome(row);
  }

  /** Confirm — the ONLY method that writes confirmed. Never calls AI. */
  async confirmOutcome(
    proposalId: string,
    teacherId: string,
    edits?: { ratingCode?: string; evidenceNote?: string },
  ) {
    const existing = await this.repository.findById(proposalId);
    if (!existing) throw new NotFoundException('Proposal not found');
    if (existing.state !== 'proposed') {
      throw new BadRequestException('Only proposed outcomes can be confirmed');
    }
    
    // Validate teacher has authority over the proposal's section/subject
    await this.validateTeacherOwnsProposal(teacherId, existing);
    
    // Block top-band edits on confirm
    if (edits?.ratingCode && TOP_BAND_CODES.has(edits.ratingCode.toLowerCase())) {
      throw new BadRequestException('Cannot jump to top band on confirmation — requires multiple observations');
    }
    
    const confirmed = await this.repository.confirm(proposalId, teacherId, {
      rating_code: edits?.ratingCode,
      evidence_note: edits?.evidenceNote,
    });
    return mapOutcome(confirmed);
  }

  private async validateChildBelongsToSection(childId: string, sectionId: string): Promise<void> {
    const client = this.repository['supabase'].getClient();
    if (!client) throw new BadRequestException('Database unavailable');
    
    const { data, error } = await client
      .from('children')
      .select('id')
      .eq('id', childId)
      .eq('section_id', sectionId)
      .eq('status', 'active')
      .maybeSingle();
    
    if (error || !data) {
      throw new ForbiddenException('Child does not belong to the requested section');
    }
  }

  private async validateTeacherOwnsProposal(teacherId: string, proposal: Record<string, unknown>): Promise<void> {
    const sectionId = proposal.section_id as string;
    const subjectId = (proposal.subject_id as string | null) ?? null;
    
    const client = this.repository['supabase'].getClient();
    if (!client) throw new BadRequestException('Database unavailable');
    
    let query = client
      .from('teacher_sections')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('section_id', sectionId);
    
    if (subjectId === null) {
      query = query.is('subject_id', null);
    } else {
      query = query.eq('subject_id', subjectId);
    }
    
    const { data, error } = await query.maybeSingle();
    if (error || !data) {
      throw new ForbiddenException('Teacher does not have authority over this proposal');
    }
  }

  async listProposed(sectionId: string) {
    const rows = await this.repository.listProposed(sectionId);
    return rows.map(mapOutcome);
  }

  async listStalledMilestones(sectionId: string, weeks = 3) {
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - weeks * 7);
    const rows = await this.repository.listStalled(sectionId, cutoff.toISOString());
    return {
      sectionId,
      privatePrompt: rows.length
        ? `Inclusive assistant: ${rows.length} milestone(s) unmoved for ${weeks}+ weeks — consider a gentle re-observation.`
        : null,
      stalledCount: rows.length,
      // Never expose child names to admin gravity surfaces
    };
  }

  /**
   * Sweep UI bootstrap: active children + band-derived outcomes.
   * Band-as-data — reads band_id off the section; never branches on grade number.
   * Children ordered by roll number only (roster order), never by rating.
   */
  async getSweepContext(sectionId: string, subjectId: string | null = null) {
    const bandId = await this.repository.findSectionBandId(sectionId);
    if (!bandId) throw new NotFoundException('Section not found');

    const [children, outcomes] = await Promise.all([
      this.repository.listChildren(sectionId),
      this.repository.listOutcomesForBand(bandId, subjectId),
    ]);

    // Stable roster order by roll number — not a rating rank-order.
    const sortedChildren = [...children].sort((a, b) =>
      a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }),
    );

    return {
      sectionId,
      bandId,
      subjectId,
      children: sortedChildren.map((c) => ({
        childId: c.id,
        name: c.name,
        rollNumber: c.rollNumber,
      })),
      outcomes: outcomes.map((o) => ({
        outcomeId: o.id as string,
        code: o.code as string,
        statement: o.statement_en as string,
      })),
    };
  }
}

function mapOutcome(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    childId: row.child_id as string,
    outcomeId: row.outcome_id as string,
    sectionId: row.section_id as string,
    ratingCode: row.rating_code as string | null,
    state: row.state as string,
    attempt: (row.attempt as string | undefined) ?? 'regular',
    evidenceNote: row.evidence_note as string | null,
  };
}
