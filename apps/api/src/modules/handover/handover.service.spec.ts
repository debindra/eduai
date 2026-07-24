import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HandoverRepository, HandoverService, tagChildFromRecency } from './handover.service';
import type { PacingService } from '../pacing/pacing.service';

describe('tagChildFromRecency', () => {
  const now = new Date('2025-06-01T00:00:00Z');

  it('tags confirm when no history', () => {
    expect(tagChildFromRecency(null, now)).toBe('confirm');
  });

  it('tags confirmed when recent', () => {
    expect(tagChildFromRecency('2025-05-20T00:00:00Z', now)).toBe('confirmed');
  });
});

describe('HandoverService', () => {
  let service: HandoverService;
  let repository: {
    listChildren: ReturnType<typeof vi.fn>;
    listConfirmedOutcomes: ReturnType<typeof vi.fn>;
    listLessonDraftRefs: ReturnType<typeof vi.fn>;
    listOpenThreads: ReturnType<typeof vi.fn>;
    insertPack: ReturnType<typeof vi.fn>;
  };
  let pacing: { getPacing: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    repository = {
      listChildren: vi.fn().mockResolvedValue([{ id: 'c1', name: 'Priya', roll_number: '1' }]),
      listConfirmedOutcomes: vi.fn().mockResolvedValue([
        {
          id: 'o1',
          child_id: 'c1',
          outcome_id: 'out1',
          rating_code: 'not_yet',
          confirmed_at: '2025-05-20T00:00:00Z',
          updated_at: '2025-05-20T00:00:00Z',
        },
      ]),
      listLessonDraftRefs: vi.fn().mockResolvedValue([{ id: 'ld1', map_slice_id: 'ms1', pedagogy_type: 'five_e' }]),
      listOpenThreads: vi.fn().mockResolvedValue([]),
      insertPack: vi.fn().mockImplementation(async (row) => ({
        id: 'hp1',
        created_at: '2025-06-01T00:00:00Z',
        ...row,
      })),
    };
    pacing = { getPacing: vi.fn().mockResolvedValue({ state: 'on_track', gapTeachingDays: 0 }) };
    service = new HandoverService(
      repository as unknown as HandoverRepository,
      pacing as unknown as PacingService,
    );
  });

  it('assembles snapshot without coach_messages', async () => {
    const pack = await service.assemble('s1', 't-departing', 't-incoming');
    const snapshot = pack.snapshot as Record<string, unknown>;
    expect(snapshot.excluded).toEqual(['coach_messages']);
    expect(JSON.stringify(snapshot)).not.toMatch(/coach_messages[^"]*content|coach_chat/);
    expect(repository.insertPack).toHaveBeenCalled();
  });
});
