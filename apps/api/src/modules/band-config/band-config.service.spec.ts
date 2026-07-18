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
    await expect(service.listPrePrimaryBands()).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('throws when the pre-primary band is missing', async () => {
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });
    getClient.mockReturnValue({ from });

    await expect(service.listPrePrimaryBands()).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('maps band, grade scales, and subjects from config rows', async () => {
    const bandsQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'band-1',
              code: 'pre_primary',
              name_en: 'Pre-primary',
              name_np: null,
              assessment_mode: 'milestone_bands',
              aggregation_rule: null,
              grade_range: 'N-UKG',
            },
          ],
          error: null,
        }),
      }),
    };
    const gradeScalesQuery = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'scale-1',
                code: 'emerging',
                label_en: 'Emerging',
                label_np: null,
                sort_order: 1,
                numeric_value: null,
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
                  code: 'holistic',
                  name_en: 'Holistic',
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

    const actual = await service.listPrePrimaryBands();

    expect(actual).toEqual([
      {
        id: 'band-1',
        code: 'pre_primary',
        nameEn: 'Pre-primary',
        nameNp: null,
        assessmentMode: 'milestone_bands',
        aggregationRule: null,
        gradeRange: 'N-UKG',
        gradeScales: [
          {
            id: 'scale-1',
            code: 'emerging',
            labelEn: 'Emerging',
            labelNp: null,
            sortOrder: 1,
            numericValue: null,
          },
        ],
        subjects: [
          {
            id: 'sub-1',
            code: 'holistic',
            nameEn: 'Holistic',
            nameNp: null,
            sortOrder: 1,
          },
        ],
      },
    ]);
  });
});
