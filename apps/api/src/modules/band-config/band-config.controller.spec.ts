import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BandConfigController } from './band-config.controller';
import type { BandConfigService } from './band-config.service';

describe('BandConfigController GET /bands', () => {
  let controller: BandConfigController;
  let bandConfigService: { listBands: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    bandConfigService = { listBands: vi.fn() };
    controller = new BandConfigController(
      bandConfigService as unknown as BandConfigService,
    );
  });

  it('wraps all band rows in a bands list response', async () => {
    const bands = [
      {
        id: 'band-1',
        code: 'pre_primary',
        nameEn: 'Pre-primary',
        nameNp: null,
        assessmentMode: 'three_state_narrative',
        aggregationRule: 'none',
        gradeRange: 'Nursery–UKG',
        gradeScales: [],
        subjects: [],
      },
      {
        id: 'band-2',
        code: 'basic_early',
        nameEn: 'Basic education (early)',
        nameNp: null,
        assessmentMode: 'four_point_scale',
        aggregationRule: 'mean_of_four_percent_letter',
        gradeRange: 'Grade 1–3',
        gradeScales: [],
        subjects: [],
      },
    ];
    bandConfigService.listBands.mockResolvedValue(bands);

    const actual = await controller.listBands();

    expect(bandConfigService.listBands).toHaveBeenCalledOnce();
    expect(actual).toEqual({ bands });
    expect(actual.bands).toHaveLength(2);
  });
});
