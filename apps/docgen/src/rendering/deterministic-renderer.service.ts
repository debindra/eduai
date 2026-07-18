import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  Document,
  Packer,
  PageOrientation,
  Paragraph,
  TextRun,
  WidthType,
  Table,
  TableCell,
  TableRow,
} from 'docx';
import { STORAGE_PORT, type StoragePort } from '../shared/ports/storage.port';
import { SupabaseService } from '../database/supabase.service';
import { landscapePageSize } from './landscape-fix';
import { hashSourceRows } from './source-hash';

export type TemplateType =
  | 'assessment_log'
  | 'monthly_report'
  | 'year_end_report'
  | 'transition_file'
  | 'inspection_pack'
  | 'leaving_pack';

export interface RenderResult {
  templateType: TemplateType;
  childId: string | null;
  sectionId: string | null;
  sourceRowHash: string;
  storageRef: string;
  documentRenderId: string;
}

@Injectable()
export class DeterministicRendererService {
  constructor(
    private readonly supabase: SupabaseService,
    @Inject(STORAGE_PORT) private readonly storage: StoragePort,
  ) {}

  private client() {
    const c = this.supabase.getClient();
    if (!c) throw new Error('Supabase is not configured');
    return c;
  }

  async renderAssessmentLog(childId: string, periodStart?: string, periodEnd?: string): Promise<RenderResult> {
    const child = await this.loadChild(childId);
    let query = this.client()
      .from('student_outcomes')
      .select('id, outcome_id, rating_code, state, confirmed_at, evidence_note, band_code')
      .eq('child_id', childId)
      .eq('state', 'confirmed');
    if (periodStart) query = query.gte('confirmed_at', periodStart);
    if (periodEnd) query = query.lte('confirmed_at', periodEnd);
    const { data: outcomes, error } = await query;
    if (error) throw error;
    const source = { child, outcomes: outcomes ?? [] };
    const hash = hashSourceRows(source);
    const buffer = await this.buildAssessmentLogDocx(child, outcomes ?? []);
    return this.persist('assessment_log', childId, child.section_id as string, hash, buffer);
  }

  async renderTransitionFile(childId: string): Promise<RenderResult> {
    const child = await this.loadChild(childId);
    const { data: outcomes, error: oErr } = await this.client()
      .from('student_outcomes')
      .select('id, outcome_id, rating_code, state, confirmed_at, evidence_note')
      .eq('child_id', childId)
      .eq('state', 'confirmed');
    if (oErr) throw oErr;
    const { data: attendance, error: aErr } = await this.client()
      .from('attendance_record')
      .select('day, status')
      .eq('child_id', childId);
    if (aErr) throw aErr;
    const source = { child, outcomes: outcomes ?? [], attendance: attendance ?? [] };
    const hash = hashSourceRows(source);
    const buffer = await this.buildTransitionDocx(child, outcomes ?? [], attendance ?? []);
    return this.persist('transition_file', childId, child.section_id as string, hash, buffer);
  }

  async renderMonthlyReport(draftId: string): Promise<RenderResult> {
    const { data: draft, error } = await this.client()
      .from('parent_report_drafts')
      .select('*')
      .eq('id', draftId)
      .maybeSingle();
    if (error) throw error;
    if (!draft) throw new NotFoundException('Report draft not found');
    if (draft.state !== 'approved') {
      throw new NotFoundException('Only approved report drafts can be rendered');
    }
    const source = {
      id: draft.id,
      body_text: draft.body_text,
      thin_data: draft.thin_data,
      evidence_snapshot: draft.evidence_snapshot,
      period_start: draft.period_start,
      period_end: draft.period_end,
    };
    const hash = hashSourceRows(source);
    const buffer = await this.buildReportDocx(draft);
    return this.persist(
      'monthly_report',
      draft.child_id as string,
      draft.section_id as string,
      hash,
      buffer,
    );
  }

  async renderInspectionPack(sectionId: string, dateStart?: string, dateEnd?: string): Promise<RenderResult> {
    const { data: children, error } = await this.client()
      .from('children')
      .select('id, name, roll_number')
      .eq('section_id', sectionId)
      .eq('status', 'active');
    if (error) throw error;
    const childList = children ?? [];
    const perChild: Array<{ childId: string; assessmentHash: string; transitionHash: string }> = [];
    for (const child of childList) {
      const assessment = await this.renderAssessmentLog(child.id as string, dateStart, dateEnd);
      const transition = await this.renderTransitionFile(child.id as string);
      perChild.push({
        childId: child.id as string,
        assessmentHash: assessment.sourceRowHash,
        transitionHash: transition.sourceRowHash,
      });
    }
    const source = { sectionId, dateStart, dateEnd, children: childList, perChild };
    const hash = hashSourceRows(source);
    const buffer = await this.buildInspectionPackDocx(sectionId, childList, perChild);
    return this.persist('inspection_pack', null, sectionId, hash, buffer);
  }

  async renderLeavingPack(childId: string): Promise<RenderResult> {
    const assessment = await this.renderAssessmentLog(childId);
    const transition = await this.renderTransitionFile(childId);
    const source = {
      childId,
      assessmentHash: assessment.sourceRowHash,
      transitionHash: transition.sourceRowHash,
    };
    const hash = hashSourceRows(source);
    const child = await this.loadChild(childId);
    const buffer = await this.buildLeavingPackDocx(child, assessment.sourceRowHash, transition.sourceRowHash);
    return this.persist('leaving_pack', childId, child.section_id as string, hash, buffer);
  }

  private async loadChild(childId: string) {
    const { data, error } = await this.client()
      .from('children')
      .select('id, name, roll_number, section_id, status')
      .eq('id', childId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException('Child not found');
    return data;
  }

  private async persist(
    templateType: TemplateType,
    childId: string | null,
    sectionId: string | null,
    hash: string,
    buffer: Buffer,
  ): Promise<RenderResult> {
    const key = `docgen/${templateType}/${childId ?? sectionId}/${hash}.docx`;
    const storageRef = await this.storage.putObject(
      key,
      buffer,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    const { data, error } = await this.client()
      .from('document_render')
      .insert({
        template_type: templateType,
        child_id: childId,
        section_id: sectionId,
        source_row_hash: hash,
        storage_ref: storageRef,
      })
      .select('id')
      .single();
    if (error) throw error;
    return {
      templateType,
      childId,
      sectionId,
      sourceRowHash: hash,
      storageRef,
      documentRenderId: data.id as string,
    };
  }

  private async buildAssessmentLogDocx(
    child: Record<string, unknown>,
    outcomes: Array<Record<string, unknown>>,
  ): Promise<Buffer> {
    const rows = outcomes.map(
      (o) =>
        new TableRow({
          children: [
            cell(String(o.outcome_id ?? '')),
            cell(String(o.rating_code ?? '')),
            cell(String(o.confirmed_at ?? '')),
            cell(String(o.evidence_note ?? '')),
          ],
        }),
    );
    const page = landscapePageSize();
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              size: {
                width: page.width,
                height: page.height,
                orientation: PageOrientation.LANDSCAPE,
              },
            },
          },
          children: [
            heading(`Assessment log — ${String(child.name)} (roll ${String(child.roll_number ?? '')})`),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [cell('Outcome'), cell('Rating'), cell('Confirmed'), cell('Evidence')],
                }),
                ...rows,
              ],
            }),
          ],
        },
      ],
    });
    return Buffer.from(await Packer.toBuffer(doc));
  }

  private async buildTransitionDocx(
    child: Record<string, unknown>,
    outcomes: Array<Record<string, unknown>>,
    attendance: Array<Record<string, unknown>>,
  ): Promise<Buffer> {
    const present = attendance.filter((a) => a.status === 'present').length;
    const absent = attendance.filter((a) => a.status === 'absent').length;
    const doc = new Document({
      sections: [
        {
          children: [
            heading(`Transition file — ${String(child.name)}`),
            para(`Attendance: ${present} present, ${absent} absent days recorded.`),
            para(`Confirmed milestones: ${outcomes.length}.`),
            ...outcomes.map((o) =>
              para(`• ${String(o.outcome_id)} — ${String(o.rating_code ?? 'n/a')}`),
            ),
          ],
        },
      ],
    });
    return Buffer.from(await Packer.toBuffer(doc));
  }

  private async buildReportDocx(draft: Record<string, unknown>): Promise<Buffer> {
    const body = String(draft.body_text ?? '');
    const doc = new Document({
      sections: [
        {
          children: [
            heading(
              `Parent report ${String(draft.period_start)} – ${String(draft.period_end)}`,
            ),
            para(body),
            draft.thin_data
              ? para('(Thin-data neutral fallback — no AI fiction.)')
              : para(''),
          ],
        },
      ],
    });
    return Buffer.from(await Packer.toBuffer(doc));
  }

  private async buildInspectionPackDocx(
    sectionId: string,
    children: Array<Record<string, unknown>>,
    perChild: Array<{ childId: string; assessmentHash: string; transitionHash: string }>,
  ): Promise<Buffer> {
    const page = landscapePageSize();
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              size: {
                width: page.width,
                height: page.height,
                orientation: PageOrientation.LANDSCAPE,
              },
            },
          },
          children: [
            heading(`Inspection pack — section ${sectionId}`),
            para(`${children.length} children included.`),
            ...perChild.map((p) =>
              para(
                `Child ${p.childId}: assessment=${p.assessmentHash.slice(0, 12)}… transition=${p.transitionHash.slice(0, 12)}…`,
              ),
            ),
          ],
        },
      ],
    });
    return Buffer.from(await Packer.toBuffer(doc));
  }

  private async buildLeavingPackDocx(
    child: Record<string, unknown>,
    assessmentHash: string,
    transitionHash: string,
  ): Promise<Buffer> {
    const doc = new Document({
      sections: [
        {
          children: [
            heading(`Leaving pack — ${String(child.name)}`),
            para(`Assessment log hash: ${assessmentHash}`),
            para(`Transition file hash: ${transitionHash}`),
          ],
        },
      ],
    });
    return Buffer.from(await Packer.toBuffer(doc));
  }
}

function heading(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 28 })],
    spacing: { after: 200 },
  });
}

function para(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    spacing: { after: 120 },
  });
}

function cell(text: string): TableCell {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, size: 18 })] })],
  });
}
