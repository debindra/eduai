import { BadRequestException, Injectable } from '@nestjs/common';
import { NEUTRAL_PARENT_REPORT_FALLBACK } from '@eduai/ai';
import { SupabaseService } from '../../database/supabase.service';
import { AiOrchestrationService } from '../ai-orchestration/ai-orchestration.service';
import { OutcomesRepository } from '../outcomes/outcomes.service';

@Injectable()
export class ReportsRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private client() {
    const c = this.supabase.getClient();
    if (!c) throw new Error('Supabase is not configured');
    return c;
  }

  async insertDraft(row: {
    child_id: string;
    section_id: string;
    period_start: string;
    period_end: string;
    state: string;
    body_text: string | null;
    thin_data: boolean;
    evidence_snapshot: unknown;
    generated_by: string | null;
  }) {
    const { data, error } = await this.client()
      .from('parent_report_drafts')
      .insert(row)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async findDraft(id: string) {
    const { data, error } = await this.client()
      .from('parent_report_drafts')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async approve(id: string, teacherId: string) {
    const { data, error } = await this.client()
      .from('parent_report_drafts')
      .update({
        state: 'approved',
        approved_by: teacherId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('state', 'draft')
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly repository: ReportsRepository,
    private readonly outcomesRepo: OutcomesRepository,
    private readonly ai: AiOrchestrationService,
  ) {}

  async draftMonthly(input: {
    sectionId: string;
    childId: string;
    bandId: string;
    periodStart: string;
    periodEnd: string;
    teacherId: string | null;
    reportLanguage?: string;
  }) {
    const evidence = await this.outcomesRepo.listConfirmedForPeriod(
      input.sectionId,
      input.periodStart,
      input.periodEnd,
    );
    const childEvidence = evidence.filter((e) => e.child_id === input.childId);

    if (childEvidence.length < 2) {
      const draft = await this.repository.insertDraft({
        child_id: input.childId,
        section_id: input.sectionId,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        state: 'draft',
        body_text: NEUTRAL_PARENT_REPORT_FALLBACK,
        thin_data: true,
        evidence_snapshot: childEvidence,
        generated_by: input.teacherId,
      });
      return mapReport(draft);
    }

    const aiResult = await this.ai.orchestrate({
      featureId: 'monthly_parent_report',
      bandId: input.bandId,
      variables: {
        report_language: input.reportLanguage ?? 'en',
        evidence_json: JSON.stringify(childEvidence),
      },
    });

    const draft = await this.repository.insertDraft({
      child_id: input.childId,
      section_id: input.sectionId,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      state: 'draft',
      body_text: aiResult.text,
      thin_data: false,
      evidence_snapshot: childEvidence,
      generated_by: input.teacherId,
    });
    return mapReport(draft);
  }

  async approve(draftId: string, teacherId: string) {
    const existing = await this.repository.findDraft(draftId);
    if (!existing) throw new BadRequestException('Draft not found');
    const approved = await this.repository.approve(draftId, teacherId);
    return mapReport(approved);
  }
}

function mapReport(row: Record<string, unknown>) {
  return {
    id: row.id as string,
    childId: row.child_id as string,
    sectionId: row.section_id as string,
    state: row.state as string,
    bodyText: row.body_text as string | null,
    thinData: row.thin_data as boolean,
    evidenceSnapshot: row.evidence_snapshot,
    periodStart: row.period_start as string,
    periodEnd: row.period_end as string,
  };
}
