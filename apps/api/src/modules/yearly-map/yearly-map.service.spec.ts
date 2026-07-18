import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { YearlyMapService } from './yearly-map.service';
import type { YearlyMapRepository } from './yearly-map.repository';

describe('YearlyMapService', () => {
  let service: YearlyMapService;
  let repository: {
    findMapForSection: ReturnType<typeof vi.fn>;
    listTeachingDays: ReturnType<typeof vi.fn>;
    deleteSlices: ReturnType<typeof vi.fn>;
    insertSlices: ReturnType<typeof vi.fn>;
    insertSliceOutcomes: ReturnType<typeof vi.fn>;
    listSlices: ReturnType<typeof vi.fn>;
    approveMap: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      findMapForSection: vi.fn(),
      listTeachingDays: vi.fn(),
      deleteSlices: vi.fn(),
      insertSlices: vi.fn(),
      insertSliceOutcomes: vi.fn(),
      listSlices: vi.fn(),
      approveMap: vi.fn(),
    };
    service = new YearlyMapService(repository as unknown as YearlyMapRepository);
  });

  it('regenerate places slices without AI and uses teaching_days', async () => {
    repository.findMapForSection.mockResolvedValue({
      id: 'map-1',
      school_calendar_id: 'cal-1',
      section_id: 'sec-1',
      status: 'draft',
    });
    repository.listTeachingDays.mockResolvedValue([
      { terminal_id: 't1', day_index: 1 },
      { terminal_id: 't1', day_index: 2 },
      { terminal_id: 't1', day_index: 3 },
      { terminal_id: 't1', day_index: 4 },
      { terminal_id: 't1', day_index: 5 },
    ]);
    repository.insertSlices.mockImplementation(async (rows: unknown[]) =>
      (rows as Array<{ teaching_day_index: number; outcome_refs: string[] }>).map((r, i) => ({
        id: `slice-${i}`,
        teaching_day_index: r.teaching_day_index,
        theme_or_chapter: 'x',
        terminal_id: 't1',
        outcome_refs: r.outcome_refs,
      })),
    );
    repository.listSlices.mockResolvedValue([]);

    await service.regenerate('sec-1');

    expect(repository.deleteSlices).toHaveBeenCalledWith('map-1');
    expect(repository.insertSlices).toHaveBeenCalled();
    const inserted = repository.insertSlices.mock.calls[0]![0] as unknown[];
    expect(inserted).toHaveLength(5);
  });

  it('getMap throws when missing', async () => {
    repository.findMapForSection.mockResolvedValue(null);
    await expect(service.getMap('sec-1')).rejects.toBeInstanceOf(NotFoundException);
  });
});
