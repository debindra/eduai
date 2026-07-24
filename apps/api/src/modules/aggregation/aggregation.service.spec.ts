import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AggregationRepository, AggregationService } from './aggregation.service';

describe('AggregationService', () => {
  let service: AggregationService;
  let repository: {
    findChild: ReturnType<typeof vi.fn>;
    findSectionBand: ReturnType<typeof vi.fn>;
    listLetterCutoffs: ReturnType<typeof vi.fn>;
    listRatingNumericMap: ReturnType<typeof vi.fn>;
    listConfirmedOutcomesForChild: ReturnType<typeof vi.fn>;
    findArea: ReturnType<typeof vi.fn>;
    listIndicatorsForArea: ReturnType<typeof vi.fn>;
    listConfirmedRatingsForChildArea: ReturnType<typeof vi.fn>;
    listAreasForSubject: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      findChild: vi.fn(),
      findSectionBand: vi.fn(),
      listLetterCutoffs: vi.fn(),
      listRatingNumericMap: vi.fn(),
      listConfirmedOutcomesForChild: vi.fn(),
      findArea: vi.fn(),
      listIndicatorsForArea: vi.fn(),
      listConfirmedRatingsForChildArea: vi.fn(),
      listAreasForSubject: vi.fn(),
    };
    service = new AggregationService(repository as unknown as AggregationRepository);
  });

  it('aggregates confirmed ratings using band letter cut-offs', async () => {
    repository.findChild.mockResolvedValue({
      id: 'child-1',
      section_id: 'section-1',
      name: 'Nisha',
      roll_number: '1',
    });
    repository.findSectionBand.mockResolvedValue({
      id: 'section-1',
      band_id: 'band-be',
    });
    repository.listLetterCutoffs.mockResolvedValue([
      { code: 'B', minPercent: 60, maxPercent: 74.99, sortOrder: 4 },
      { code: 'A', minPercent: 75, maxPercent: 89.99, sortOrder: 5 },
      { code: 'A+', minPercent: 90, maxPercent: 100, sortOrder: 6 },
    ]);
    repository.listRatingNumericMap.mockResolvedValue(
      new Map([
        ['1', 1],
        ['2', 2],
        ['3', 3],
        ['4', 4],
      ]),
    );
    repository.listConfirmedOutcomesForChild.mockResolvedValue([
      { id: 'o1', rating_code: '3', state: 'confirmed' },
      { id: 'o2', rating_code: '3', state: 'confirmed' },
      { id: 'o3', rating_code: '4', state: 'confirmed' },
      { id: 'o4', rating_code: '2', state: 'confirmed' },
    ]);

    const result = await service.aggregateChild('child-1');
    expect(result.percent).toBe(75);
    expect(result.letterCode).toBe('A');
    expect(result.childId).toBe('child-1');
  });

  it('I8: area aggregation returns withheld when indicators missing', async () => {
    repository.findChild.mockResolvedValue({
      id: 'child-1',
      section_id: 'section-1',
    });
    repository.findArea.mockResolvedValue({
      id: 'area-1',
      code: 'ENG4-U1',
      indicator_count: 4,
    });
    repository.listIndicatorsForArea.mockResolvedValue([
      { id: 'i1', code: 'ENG4.U1.1' },
      { id: 'i2', code: 'ENG4.U1.2' },
      { id: 'i3', code: 'ENG4.U1.3' },
      { id: 'i4', code: 'ENG4.U1.4' },
    ]);
    repository.listConfirmedRatingsForChildArea.mockResolvedValue([
      {
        rating: 3,
        state: 'confirmed',
        created_at: '2026-01-01',
        indicators: { code: 'ENG4.U1.1' },
      },
    ]);

    const result = await service.aggregateArea('child-1', 'area-1');
    expect(result.status).toBe('withheld');
    if (result.status === 'withheld') {
      expect(result.missingIndicators).toContain('ENG4.U1.2');
    }
  });
});
