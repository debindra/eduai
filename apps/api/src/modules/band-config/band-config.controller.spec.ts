import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BandConfigController } from './band-config.controller';
import type { BandConfigService } from './band-config.service';

describe('BandConfigController GET /bands', () => {
  let controller: BandConfigController;
  let bandConfigService: { listPrePrimaryBands: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    bandConfigService = { listPrePrimaryBands: vi.fn() };
    controller = new BandConfigController(
      bandConfigService as unknown as BandConfigService,
    );
  });

  it('wraps band rows in a bands list response', async () => {
    const bands = [
      {
        id: 'band-1',
        code: 'pre_primary',
        nameEn: 'Pre-primary',
        nameNp: null,
        assessmentMode: 'milestone_bands',
        aggregationRule: null,
        gradeRange: 'N-UKG',
        gradeScales: [],
        subjects: [],
      },
    ];
    bandConfigService.listPrePrimaryBands.mockResolvedValue(bands);

    const actual = await controller.listBands();

    expect(bandConfigService.listPrePrimaryBands).toHaveBeenCalledOnce();
    expect(actual).toEqual({ bands });
  });
});
