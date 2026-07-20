import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { YearlyMapService } from './yearly-map.service';
import type { YearlyMapRepository } from './yearly-map.repository';

describe('YearlyMapService', () => {
  let service: YearlyMapService;
  let repository: {
    findMapForSection: ReturnType<typeof vi.fn>;
    findApprovedCalendarIdForSection: ReturnType<typeof vi.fn>;
    createDraftMap: ReturnType<typeof vi.fn>;
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
      findApprovedCalendarIdForSection: vi.fn(),
      createDraftMap: vi.fn(),
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

  it('ensureMap returns existing map without creating', async () => {
    repository.findMapForSection.mockResolvedValue({
      id: 'map-1',
      school_calendar_id: 'cal-1',
      section_id: 'sec-1',
      status: 'draft',
    });
    repository.listSlices.mockResolvedValue([
      {
        id: 's1',
        terminal_id: 't1',
        teaching_day_index: 1,
        theme_or_chapter: 'Animals',
        outcome_refs: [],
      },
    ]);

    const result = await service.ensureMap('sec-1');

    expect(result.id).toBe('map-1');
    expect(result.slices).toHaveLength(1);
    expect(repository.createDraftMap).not.toHaveBeenCalled();
  });

  it('ensureMap creates draft and regenerates when missing', async () => {
    const draft = {
      id: 'map-new',
      school_calendar_id: 'cal-1',
      section_id: 'sec-1',
      status: 'draft',
    };
    repository.findMapForSection
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(draft)
      .mockResolvedValue(draft);
    repository.findApprovedCalendarIdForSection.mockResolvedValue('cal-1');
    repository.createDraftMap.mockResolvedValue(draft);
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

    await service.ensureMap('sec-1');

    expect(repository.createDraftMap).toHaveBeenCalledWith('cal-1', 'sec-1');
    expect(repository.insertSlices).toHaveBeenCalled();
  });

  it('ensureMap throws when no approved calendar', async () => {
    repository.findMapForSection.mockResolvedValue(null);
    repository.findApprovedCalendarIdForSection.mockResolvedValue(null);

    await expect(service.ensureMap('sec-1')).rejects.toThrow(
      /No approved school calendar/,
    );
  });

  it('regenerate creates draft when map is missing', async () => {
    const draft = {
      id: 'map-new',
      school_calendar_id: 'cal-1',
      section_id: 'sec-1',
      status: 'draft',
    };
    repository.findMapForSection.mockResolvedValueOnce(null).mockResolvedValue(draft);
    repository.findApprovedCalendarIdForSection.mockResolvedValue('cal-1');
    repository.createDraftMap.mockResolvedValue(draft);
    repository.listTeachingDays.mockResolvedValue([]);
    repository.insertSlices.mockResolvedValue([]);
    repository.listSlices.mockResolvedValue([]);

    await service.regenerate('sec-1');

    expect(repository.createDraftMap).toHaveBeenCalledWith('cal-1', 'sec-1');
  });
});
