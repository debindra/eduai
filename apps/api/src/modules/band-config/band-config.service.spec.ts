import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BandConfigService } from './band-config.service';
import type { SupabaseService } from '../../database/supabase.service';

describe('BandConfigService', () => {
  let service: BandConfigService;
  let getClient: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getClient = vi.fn();
    service = new BandConfigService({
      getClient,
    } as unknown as SupabaseService);
  });

  it('throws when the database client is not configured', async () => {
    getClient.mockReturnValue(null);
    await expect(service.listBands()).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when no bands are found', async () => {
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    getClient.mockReturnValue({ from });

    await expect(service.listBands()).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps all bands with grade scales and subjects, ordered by band hierarchy', async () => {
    const bandsQuery = {
      select: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'band-early',
            code: 'basic_early',
            name_en: 'Basic education (early)',
            name_np: null,
            assessment_mode: 'four_point_scale',
            aggregation_rule: 'mean_of_four_percent_letter',
            grade_range: 'Grade 1–3',
          },
          {
            id: 'band-pp',
            code: 'pre_primary',
            name_en: 'Pre-primary',
            name_np: null,
            assessment_mode: 'three_state_narrative',
            aggregation_rule: 'none',
            grade_range: 'Nursery–UKG',
          },
          {
            id: 'band-upper',
            code: 'basic_upper',
            name_en: 'Basic education (upper)',
            name_np: null,
            assessment_mode: 'four_point_scale',
            aggregation_rule: 'mean_of_four_percent_letter',
            grade_range: 'Grade 4–5',
          },
        ],
        error: null,
      }),
    };
    const gradeScalesQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'scale-1',
                code: 'not_yet',
                label_en: 'Emerging',
                label_np: null,
                sort_order: 1,
                numeric_value: 1,
              },
            ],
            error: null,
          }),
        }),
      }),
    };
    const bandSubjectsQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              {
                sort_order: 1,
                subjects: {
                  id: 'sub-1',
                  code: 'nepali',
                  name_en: 'Nepali',
                  name_np: null,
                },
              },
            ],
            error: null,
          }),
        }),
      }),
    };

    const from = vi.fn((table: string) => {
      if (table === 'bands') return bandsQuery;
      if (table === 'grade_scales') return gradeScalesQuery;
      if (table === 'band_subjects') return bandSubjectsQuery;
      throw new Error(`Unexpected table ${table}`);
    });
    getClient.mockReturnValue({ from });

    const actual = await service.listBands();

    expect(actual.map((b) => b.code)).toEqual([
      'pre_primary',
      'basic_early',
      'basic_upper',
    ]);
    expect(actual[0]).toMatchObject({
      id: 'band-pp',
      code: 'pre_primary',
      nameEn: 'Pre-primary',
      assessmentMode: 'three_state_narrative',
      gradeScales: [
        {
          id: 'scale-1',
          code: 'not_yet',
          labelEn: 'Emerging',
          labelNp: null,
          sortOrder: 1,
          numericValue: 1,
        },
      ],
      subjects: [
        {
          id: 'sub-1',
          code: 'nepali',
          nameEn: 'Nepali',
          nameNp: null,
          sortOrder: 1,
        },
      ],
    });
    expect(actual).toHaveLength(3);
  });
});
