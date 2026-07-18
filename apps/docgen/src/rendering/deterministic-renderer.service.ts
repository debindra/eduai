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
  | 'leaving_pack'
  | 'annex_2'
  | 'annex_3'
  | 'annex_4';

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

  /**
   * Annex 2 — per-child outcome rating log (CDC Grades 1–3).
   * Confirmed rows only; zero AI; landscape.
   */
  async renderAnnex2(childId: string, terminalId?: string): Promise<RenderResult> {
    const child = await this.loadChild(childId);
    let query = this.client()
      .from('student_outcomes')
      .select('id, outcome_id, rating_code, state, confirmed_at, evidence_note, attempt, subject_id')
      .eq('child_id', childId)
      .eq('state', 'confirmed');
    const { data: outcomes, error } = await query;
    if (error) throw error;
    const source = { child, terminalId: terminalId ?? null, outcomes: outcomes ?? [] };
    const hash = hashSourceRows(source);
    const buffer = await this.buildAnnex2Docx(child, outcomes ?? [], terminalId);
    return this.persist('annex_2', childId, child.section_id as string, hash, buffer);
  }

  /**
   * Annex 3 — subject-level summary with letter grade from aggregation math.
   * Percent/letter computed from confirmed ratings; cut-offs from grade_scales.
   */
  async renderAnnex3(childId: string, subjectId: string): Promise<RenderResult> {
    const child = await this.loadChild(childId);
    const section = await this.loadSection(child.section_id as string);
    const { data: outcomes, error } = await this.client()
      .from('student_outcomes')
      .select('id, outcome_id, rating_code, state, confirmed_at, subject_id')
      .eq('child_id', childId)
      .eq('subject_id', subjectId)
      .eq('state', 'confirmed');
    if (error) throw error;
    const agg = await this.computeLetterGrade(section.band_id as string, outcomes ?? []);
    const source = { child, subjectId, outcomes: outcomes ?? [], agg };
    const hash = hashSourceRows(source);
    const buffer = await this.buildAnnex3Docx(child, subjectId, outcomes ?? [], agg);
    return this.persist('annex_3', childId, child.section_id as string, hash, buffer);
  }

  /**
   * Annex 4 — terminal report card: letter grades per subject (no AI fiction).
   */
  async renderAnnex4(childId: string): Promise<RenderResult> {
    const child = await this.loadChild(childId);
    const section = await this.loadSection(child.section_id as string);
    const { data: outcomes, error } = await this.client()
      .from('student_outcomes')
      .select('id, outcome_id, rating_code, state, subject_id')
      .eq('child_id', childId)
      .eq('state', 'confirmed');
    if (error) throw error;
    const bySubject = new Map<string, Array<Record<string, unknown>>>();
    for (const o of outcomes ?? []) {
      const sid = (o.subject_id as string | null) ?? 'none';
      const list = bySubject.get(sid) ?? [];
      list.push(o);
      bySubject.set(sid, list);
    }
    const subjectGrades: Array<{ subjectId: string; percent: number; letterCode: string; n: number }> =
      [];
    for (const [subjectId, rows] of bySubject) {
      const agg = await this.computeLetterGrade(section.band_id as string, rows);
      subjectGrades.push({ subjectId, ...agg });
    }
    const source = { child, subjectGrades };
    const hash = hashSourceRows(source);
    const buffer = await this.buildAnnex4Docx(child, subjectGrades);
    return this.persist('annex_4', childId, child.section_id as string, hash, buffer);
  }

  private async loadSection(sectionId: string) {
    const { data, error } = await this.client()
      .from('sections')
      .select('id, band_id, name')
      .eq('id', sectionId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException('Section not found');
    return data;
  }

  /** Pure arithmetic: Σ ÷ (4 × n) × 100 → letter from grade_scales cut-offs. */
  private async computeLetterGrade(
    bandId: string,
    outcomes: Array<Record<string, unknown>>,
  ): Promise<{ percent: number; letterCode: string; n: number }> {
    if (outcomes.length === 0) {
      return { percent: 0, letterCode: 'E', n: 0 };
    }
    const { data: ratings, error: rErr } = await this.client()
      .from('grade_scales')
      .select('code, numeric_value')
      .eq('band_id', bandId)
      .eq('kind', 'rating');
    if (rErr) throw rErr;
    const ratingMap = new Map(
      (ratings ?? []).map((r) => [r.code as string, Number(r.numeric_value)]),
    );
    const { data: letters, error: lErr } = await this.client()
      .from('grade_scales')
      .select('code, min_percent, max_percent, sort_order')
      .eq('band_id', bandId)
      .eq('kind', 'letter')
      .order('sort_order', { ascending: true });
    if (lErr) throw lErr;
    let sum = 0;
    for (const o of outcomes) {
      const n = ratingMap.get(o.rating_code as string);
      if (n === undefined) throw new Error(`Unknown rating ${o.rating_code}`);
      sum += n;
    }
    const n = outcomes.length;
    const percent = (sum / (4 * n)) * 100;
    const cutoffs = letters ?? [];
    let letterCode = 'E';
    for (const c of cutoffs) {
      if (percent >= Number(c.min_percent) && percent <= Number(c.max_percent)) {
        letterCode = c.code as string;
        break;
      }
    }
    return { percent, letterCode, n };
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

  private async buildAnnex2Docx(
    child: Record<string, unknown>,
    outcomes: Array<Record<string, unknown>>,
    terminalId?: string,
  ): Promise<Buffer> {
    const page = landscapePageSize();
    const rows = outcomes.map(
      (o) =>
        new TableRow({
          children: [
            cell(String(o.outcome_id ?? '')),
            cell(String(o.rating_code ?? '')),
            cell(String(o.attempt ?? 'regular')),
            cell(String(o.confirmed_at ?? '')),
          ],
        }),
    );
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
            heading(
              `Annex 2 — ${String(child.name)} (roll ${String(child.roll_number ?? '')})${terminalId ? ` · terminal ${terminalId}` : ''}`,
            ),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [cell('Outcome'), cell('Rating'), cell('Attempt'), cell('Confirmed')],
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

  private async buildAnnex3Docx(
    child: Record<string, unknown>,
    subjectId: string,
    outcomes: Array<Record<string, unknown>>,
    agg: { percent: number; letterCode: string; n: number },
  ): Promise<Buffer> {
    const doc = new Document({
      sections: [
        {
          children: [
            heading(`Annex 3 — ${String(child.name)} · subject ${subjectId}`),
            para(`Confirmed outcomes: ${agg.n}`),
            para(`Percent: ${agg.percent.toFixed(2)}`),
            para(`Letter grade: ${agg.letterCode}`),
            ...outcomes.map((o) =>
              para(`• ${String(o.outcome_id)} — ${String(o.rating_code)}`),
            ),
          ],
        },
      ],
    });
    return Buffer.from(await Packer.toBuffer(doc));
  }

  private async buildAnnex4Docx(
    child: Record<string, unknown>,
    subjectGrades: Array<{ subjectId: string; percent: number; letterCode: string; n: number }>,
  ): Promise<Buffer> {
    const page = landscapePageSize();
    const rows = subjectGrades.map(
      (g) =>
        new TableRow({
          children: [
            cell(g.subjectId),
            cell(String(g.n)),
            cell(g.percent.toFixed(1)),
            cell(g.letterCode),
          ],
        }),
    );
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
            heading(`Annex 4 — Report card · ${String(child.name)}`),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({
                  children: [cell('Subject'), cell('n'), cell('Percent'), cell('Letter')],
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
