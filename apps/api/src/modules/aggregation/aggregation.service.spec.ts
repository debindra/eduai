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
  };

  beforeEach(() => {
    repository = {
      findChild: vi.fn(),
      findSectionBand: vi.fn(),
      listLetterCutoffs: vi.fn(),
      listRatingNumericMap: vi.fn(),
      listConfirmedOutcomesForChild: vi.fn(),
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
});
