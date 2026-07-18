import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NEUTRAL_PARENT_REPORT_FALLBACK } from '@eduai/ai';
import { DeterministicRendererService } from './deterministic-renderer.service';
import type { SupabaseService } from '../database/supabase.service';
import type { StoragePort } from '../shared/ports/storage.port';
import { hashSourceRows } from './source-hash';

describe('DeterministicRendererService', () => {
  let service: DeterministicRendererService;
  let storage: { putObject: ReturnType<typeof vi.fn>; getSignedUrl: ReturnType<typeof vi.fn> };
  let insertSingle: ReturnType<typeof vi.fn>;
  let fromMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    storage = {
      putObject: vi.fn().mockResolvedValue('file:///tmp/doc.docx'),
      getSignedUrl: vi.fn(),
    };
    insertSingle = vi.fn().mockResolvedValue({ data: { id: 'dr-1' }, error: null });

    const childRow = {
      id: 'c1',
      name: 'Priya',
      roll_number: '1',
      section_id: 's1',
      status: 'active',
    };
    const outcomes = [
      {
        id: 'o1',
        outcome_id: 'out-1',
        rating_code: 'emerging',
        state: 'confirmed',
        confirmed_at: '2025-04-20T00:00:00Z',
        evidence_note: 'seen once',
        band_code: null,
      },
    ];

    fromMock = vi.fn((table: string) => {
      if (table === 'children') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: childRow, error: null }),
            }),
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
            eq: () => Promise.resolve({ data: [{ day: '2025-04-15', status: 'present' }], error: null }),
          }),
        };
      }
      if (table === 'parent_report_drafts') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  id: 'draft-1',
                  child_id: 'c1',
                  section_id: 's1',
                  state: 'approved',
                  body_text: NEUTRAL_PARENT_REPORT_FALLBACK,
                  thin_data: true,
                  evidence_snapshot: [],
                  period_start: '2025-04-01',
                  period_end: '2025-04-30',
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'document_render') {
        return {
          insert: () => ({
            select: () => ({
              single: insertSingle,
            }),
          }),
        };
      }
      return {};
    });

    const supabase = {
      getClient: () => ({ from: fromMock }),
    } as unknown as SupabaseService;

    service = new DeterministicRendererService(supabase, storage as unknown as StoragePort);
  });

  it('renders assessment log with source_row_hash and never calls AI', async () => {
    const result = await service.renderAssessmentLog('c1');
    expect(result.templateType).toBe('assessment_log');
    expect(result.sourceRowHash).toHaveLength(64);
    expect(storage.putObject).toHaveBeenCalledOnce();
    expect(insertSingle).toHaveBeenCalled();
  });

  it('same source rows produce the same hash (idempotent)', () => {
    const source = { child: { id: 'c1' }, outcomes: [{ id: 'o1' }] };
    expect(hashSourceRows(source)).toBe(hashSourceRows(source));
  });

  it('renders thin-data approved report without inventing text', async () => {
    const result = await service.renderMonthlyReport('draft-1');
    expect(result.templateType).toBe('monthly_report');
    expect(result.sourceRowHash).toBeTruthy();
    const putArgs = storage.putObject.mock.calls[0];
    expect(putArgs[1]).toBeInstanceOf(Buffer);
  });

  it('renders Annex 2 with confirmed outcomes only (deterministic)', async () => {
    const result = await service.renderAnnex2('c1', 'term-1');
    expect(result.templateType).toBe('annex_2');
    expect(result.sourceRowHash).toHaveLength(64);
    expect(storage.putObject).toHaveBeenCalled();
  });
});
