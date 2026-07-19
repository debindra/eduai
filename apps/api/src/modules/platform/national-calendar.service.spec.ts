import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseService } from '../../database/supabase.service';
import { NationalCalendarService } from './national-calendar.service';

function createThenableResult<T>(result: T) {
  const builder = {
    select: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
    then: undefined as unknown,
  };
  builder.then = (
    resolve: (value: T) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject);
  return builder;
}

describe('NationalCalendarService', () => {
  let service: NationalCalendarService;
  let from: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    from = vi.fn();
    service = new NationalCalendarService({
      getClient: () => ({ from }),
    } as unknown as SupabaseService);
  });

  describe('createDraft', () => {
    it('creates a draft calendar for a BS year', async () => {
      from.mockImplementation(() =>
        createThenableResult({
          data: { id: 'nat-1', bs_year: 2082, status: 'draft' },
          error: null,
        }),
      );
      const actual = await service.createDraft({ bsYear: 2082 });
      expect(actual).toEqual({
        id: 'nat-1',
        bsYear: 2082,
        status: 'draft',
        closures: [],
      });
    });

    it('rejects when insert fails', async () => {
      from.mockImplementation(() =>
        createThenableResult({ data: null, error: { message: 'unique' } }),
      );
      await expect(service.createDraft({ bsYear: 2082 })).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('getCalendar', () => {
    it('rejects when calendar is missing', async () => {
      from.mockImplementation(() =>
        createThenableResult({ data: null, error: null }),
      );
      await expect(service.getCalendar('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns calendar with mapped closures', async () => {
      from.mockImplementation((table: string) => {
        if (table === 'national_calendars') {
          return createThenableResult({
            data: { id: 'nat-1', bs_year: 2082, status: 'draft' },
            error: null,
          });
        }
        if (table === 'national_closures') {
          return createThenableResult({
            data: [
              {
                id: 'nc-1',
                name: 'Dashain',
                category: 'festival',
                start_date: '2025-10-02',
                end_date: '2025-10-12',
                bs_label: 'Ashwin',
                movable: true,
              },
            ],
            error: null,
          });
        }
        return createThenableResult({ data: null, error: null });
      });

      const actual = await service.getCalendar('nat-1');
      expect(actual.bsYear).toBe(2082);
      expect(actual.closures[0]).toEqual({
        id: 'nc-1',
        name: 'Dashain',
        category: 'festival',
        startDate: '2025-10-02',
        endDate: '2025-10-12',
        bsLabel: 'Ashwin',
        movable: true,
      });
    });
  });

  describe('publish', () => {
    it('demotes other published calendars for the same BS year then publishes', async () => {
      const demoteUpdates: unknown[] = [];
      const publishUpdates: unknown[] = [];
      let calendarCall = 0;

      from.mockImplementation((table: string) => {
        if (table === 'national_calendars') {
          calendarCall += 1;
          // getCalendar (maybeSingle) then demote update then publish update then listClosures via getCalendar path
          if (calendarCall === 1) {
            return createThenableResult({
              data: { id: 'nat-new', bs_year: 2082, status: 'draft' },
              error: null,
            });
          }
          // demote: await update(...).eq().eq().neq() — thenable without single
          if (calendarCall === 2) {
            const builder = createThenableResult({ error: null });
            const originalUpdate = builder.update;
            builder.update = vi.fn((payload: unknown) => {
              demoteUpdates.push(payload);
              return originalUpdate();
            });
            return builder;
          }
          // publish: update().eq().select().single()
          if (calendarCall === 3) {
            const builder = createThenableResult({
              data: { id: 'nat-new', bs_year: 2082, status: 'published' },
              error: null,
            });
            const originalUpdate = builder.update;
            builder.update = vi.fn((payload: unknown) => {
              publishUpdates.push(payload);
              return originalUpdate();
            });
            return builder;
          }
          return createThenableResult({
            data: { id: 'nat-new', bs_year: 2082, status: 'published' },
            error: null,
          });
        }
        if (table === 'national_closures') {
          return createThenableResult({ data: [], error: null });
        }
        return createThenableResult({ data: null, error: null });
      });

      const actual = await service.publish('nat-new');
      expect(actual.status).toBe('published');
      expect(demoteUpdates).toContainEqual({ status: 'draft' });
      expect(publishUpdates).toContainEqual({ status: 'published' });
    });
  });

  describe('listPublishedClosuresForBsYear', () => {
    it('returns empty when no published calendar exists for the year', async () => {
      from.mockImplementation(() =>
        createThenableResult({ data: null, error: null }),
      );
      await expect(service.listPublishedClosuresForBsYear(2082)).resolves.toEqual(
        [],
      );
    });

    it('returns closures for the published calendar', async () => {
      from.mockImplementation((table: string) => {
        if (table === 'national_calendars') {
          return createThenableResult({
            data: { id: 'nat-pub' },
            error: null,
          });
        }
        if (table === 'national_closures') {
          return createThenableResult({
            data: [
              {
                id: 'nc-1',
                name: 'Tihar',
                category: 'festival',
                start_date: '2025-10-20',
                end_date: '2025-10-24',
                bs_label: null,
                movable: false,
              },
            ],
            error: null,
          });
        }
        return createThenableResult({ data: null, error: null });
      });

      const actual = await service.listPublishedClosuresForBsYear(2082);
      expect(actual).toHaveLength(1);
      expect(actual[0]?.name).toBe('Tihar');
      expect(actual[0]?.startDate).toBe('2025-10-20');
    });
  });

  describe('upsertClosures', () => {
    it('inserts a new closure when id is omitted', async () => {
      let closuresFromCount = 0;
      from.mockImplementation((table: string) => {
        if (table === 'national_calendars') {
          return createThenableResult({
            data: { id: 'nat-1', bs_year: 2082, status: 'draft' },
            error: null,
          });
        }
        if (table === 'national_closures') {
          closuresFromCount += 1;
          if (closuresFromCount === 1) {
            // listClosures inside getCalendar
            return createThenableResult({ data: [], error: null });
          }
          return createThenableResult({
            data: {
              id: 'nc-new',
              name: 'Local festival',
              category: 'day_off',
              start_date: '2025-09-01',
              end_date: '2025-09-01',
              bs_label: null,
              movable: false,
            },
            error: null,
          });
        }
        return createThenableResult({ data: null, error: null });
      });

      const actual = await service.upsertClosures('nat-1', [
        {
          name: 'Local festival',
          category: 'day_off',
          startDate: '2025-09-01',
          endDate: '2025-09-01',
        },
      ]);
      expect(actual.closures).toHaveLength(1);
      expect(actual.closures[0]?.id).toBe('nc-new');
      expect(actual.closures[0]?.name).toBe('Local festival');
    });
  });
});
