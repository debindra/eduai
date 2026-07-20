import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NEUTRAL_PARENT_REPORT_FALLBACK } from '@eduai/ai';
import { DeterministicRendererService } from './deterministic-renderer.service';
import { hashSourceRows } from './source-hash';
import type { SupabaseService } from '../database/supabase.service';
import type { StoragePort } from '../shared/ports/storage.port';

/**
 * P2-TEST-01 — Curriculum-2077 compliance cycle:
 * assessment log → monthly report → transition → inspection pack
 * with document_render.source_row_hash traceability.
 */
describe('P2-TEST-01 Curriculum-2077 compliance cycle', () => {
  let service: DeterministicRendererService;
  let storedHashes: string[];
  let storage: StoragePort;
  let documentRenders: Array<Record<string, unknown>>;

  const child = {
    id: '88888888-8888-8888-8888-888888888881',
    name: 'Priya',
    roll_number: '1',
    section_id: '66666666-6666-6666-6666-666666666666',
    status: 'active',
  };

  const outcomes = [
    {
      id: 'o1',
      outcome_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
      rating_code: 'emerging',
      state: 'confirmed',
      confirmed_at: '2025-04-20T00:00:00Z',
      evidence_note: 'seen in circle time',
      band_code: null,
    },
  ];

  const attendance = [
    { day: '2025-04-15', status: 'present' },
    { day: '2025-04-16', status: 'absent' },
  ];

  const approvedDraft = {
    id: 'draft-approved',
    child_id: child.id,
    section_id: child.section_id,
    state: 'approved',
    body_text: NEUTRAL_PARENT_REPORT_FALLBACK,
    thin_data: true,
    evidence_snapshot: outcomes,
    period_start: '2025-04-01',
    period_end: '2025-04-30',
  };

  beforeEach(() => {
    storedHashes = [];
    documentRenders = [];
    storage = {
      putObject: vi.fn(async (key: string, _body: Buffer) => {
        return `file:///${key}`;
      }),
      getSignedUrl: vi.fn(async (key: string) => `file:///${key}`),
    };

    const fromMock = vi.fn((table: string) => {
      if (table === 'children') {
        return {
          select: () => ({
            eq: (_col: string, val: string) => {
              if (val === child.section_id) {
                return {
                  eq: () => Promise.resolve({ data: [child], error: null }),
                };
              }
              return {
                maybeSingle: () => Promise.resolve({ data: child, error: null }),
                eq: () => Promise.resolve({ data: [child], error: null }),
              };
            },
          }),
        };
      }
      if (table === 'student_outcomes') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => Promise.resolve({ data: outcomes, error: null }),
            }),
          }),
        };
      }
      if (table === 'attendance_record') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: attendance, error: null }),
          }),
        };
      }
      if (table === 'parent_report_drafts') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: approvedDraft, error: null }),
            }),
          }),
        };
      }
      if (table === 'document_render') {
        return {
          insert: (row: Record<string, unknown>) => {
            documentRenders.push(row);
            storedHashes.push(row.source_row_hash as string);
            return {
              select: () => ({
                single: () =>
                  Promise.resolve({
                    data: { id: `dr-${documentRenders.length}` },
                    error: null,
                  }),
              }),
            };
          },
        };
      }
      return {};
    });

    const supabase = {
      getClient: () => ({ from: fromMock }),
    } as unknown as SupabaseService;

    service = new DeterministicRendererService(supabase, storage);
  });

  it('runs full cycle with source_row_hash traceability', async () => {
    const assessment = await service.renderAssessmentLog(child.id);
    expect(assessment.templateType).toBe('assessment_log');
    expect(assessment.sourceRowHash).toBe(
      hashSourceRows({ child, outcomes }),
    );

    const monthly = await service.renderMonthlyReport(approvedDraft.id);
    expect(monthly.templateType).toBe('monthly_report');
    expect(monthly.sourceRowHash).toBe(
      hashSourceRows({
        id: approvedDraft.id,
        body_text: approvedDraft.body_text,
        thin_data: approvedDraft.thin_data,
        evidence_snapshot: approvedDraft.evidence_snapshot,
        period_start: approvedDraft.period_start,
        period_end: approvedDraft.period_end,
      }),
    );

    const transition = await service.renderTransitionFile(child.id);
    expect(transition.templateType).toBe('transition_file');
    expect(transition.sourceRowHash).toBe(
      hashSourceRows({ child, outcomes, attendance }),
    );

    const pack = await service.renderInspectionPack(child.section_id);
    expect(pack.templateType).toBe('inspection_pack');
    expect(pack.sourceRowHash).toHaveLength(64);

    // Every document_render row carries a matching hash
    expect(documentRenders.length).toBeGreaterThanOrEqual(4);
    for (const row of documentRenders) {
      expect(row.source_row_hash).toMatch(/^[a-f0-9]{64}$/);
      expect(row.storage_ref).toBeTruthy();
    }

    // Regenerating assessment with same rows yields same hash (idempotent)
    const again = await service.renderAssessmentLog(child.id);
    expect(again.sourceRowHash).toBe(assessment.sourceRowHash);
  });
});
