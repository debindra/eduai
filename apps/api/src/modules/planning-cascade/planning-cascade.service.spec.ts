import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PlanningCascadeRepository,
  PlanningCascadeService,
} from './planning-cascade.service';
import type { YearlyMapService } from '../yearly-map/yearly-map.service';

describe('PlanningCascadeService', () => {
  let service: PlanningCascadeService;
  let yearlyMap: { ensureMap: ReturnType<typeof vi.fn> };
  let repository: {
    listTeachingDaysInRange: ReturnType<typeof vi.fn>;
    listOverrides: ReturnType<typeof vi.fn>;
    upsertOverride: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    yearlyMap = { ensureMap: vi.fn() };
    repository = {
      listTeachingDaysInRange: vi.fn(),
      listOverrides: vi.fn(),
      upsertOverride: vi.fn(),
    };
    service = new PlanningCascadeService(
      yearlyMap as unknown as YearlyMapService,
      repository as unknown as PlanningCascadeRepository,
    );
  });

  it('monthly resolves from yearly map slices', async () => {
    yearlyMap.ensureMap.mockResolvedValue({
      schoolCalendarId: 'cal-1',
      slices: [
        { id: 's1', teachingDayIndex: 1, themeOrChapter: 'Animals' },
      ],
    });
    repository.listTeachingDaysInRange.mockResolvedValue([
      { day: '2025-04-15', day_index: 1, terminal_id: 't1' },
    ]);

    const result = await service.getMonthly('sec-1', 2025, 4);
    expect(result.days[0]?.themeOrChapter).toBe('Animals');
  });

  it('weekly override wins over map slice', async () => {
    yearlyMap.ensureMap.mockResolvedValue({
      schoolCalendarId: 'cal-1',
      slices: [
        { id: 's1', teachingDayIndex: 1, themeOrChapter: 'Animals' },
      ],
    });
    repository.listTeachingDaysInRange.mockResolvedValue([
      { day: '2025-04-14', day_index: 1, terminal_id: 't1' },
    ]);
    repository.listOverrides.mockResolvedValue([
      {
        day_date: '2025-04-14',
        theme_or_chapter: 'Letters and sounds',
        notes: 'Sunday adjust',
      },
    ]);

    const result = await service.getWeekly('sec-1', '2025-04-13');
    expect(result.days[0]?.themeOrChapter).toBe('Letters and sounds');
    expect(result.days[0]?.overridden).toBe(true);
  });

  it('daily resolves from weekly cell', async () => {
    yearlyMap.ensureMap.mockResolvedValue({
      schoolCalendarId: 'cal-1',
      slices: [
        { id: 's1', teachingDayIndex: 1, themeOrChapter: 'Food we eat' },
      ],
    });
    repository.listTeachingDaysInRange.mockResolvedValue([
      { day: '2025-04-15', day_index: 1, terminal_id: 't1' },
    ]);
    repository.listOverrides.mockResolvedValue([]);

    const day = await service.getDaily('sec-1', '2025-04-15');
    expect(day.themeOrChapter).toBe('Food we eat');
  });
});
