import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRE_PRIMARY_THEMES,
  placeThemesOnTeachingDays,
} from './placement';

describe('placeThemesOnTeachingDays', () => {
  it('is deterministic for the same inputs', () => {
    const input = {
      terminalId: 't1',
      teachingDayIndices: Array.from({ length: 40 }, (_, i) => i + 1),
      themes: DEFAULT_PRE_PRIMARY_THEMES,
    };
    const a = placeThemesOnTeachingDays(input);
    const b = placeThemesOnTeachingDays(input);
    expect(a).toEqual(b);
  });

  it('reserves a consolidation window at the end', () => {
    const days = Array.from({ length: 50 }, (_, i) => i + 1);
    const placed = placeThemesOnTeachingDays({
      terminalId: 't1',
      teachingDayIndices: days,
      themes: DEFAULT_PRE_PRIMARY_THEMES,
      consolidationFraction: 0.1,
    });
    const consol = placed.filter((s) => s.isConsolidation);
    expect(consol.length).toBeGreaterThanOrEqual(3);
    expect(consol.every((s) => s.themeOrChapter === 'Consolidation')).toBe(true);
    expect(placed[placed.length - 1]?.isConsolidation).toBe(true);
  });

  it('reflows when teaching-day count shrinks (Dashain-style)', () => {
    const full = placeThemesOnTeachingDays({
      terminalId: 't1',
      teachingDayIndices: Array.from({ length: 60 }, (_, i) => i + 1),
      themes: DEFAULT_PRE_PRIMARY_THEMES,
    });
    const shrunk = placeThemesOnTeachingDays({
      terminalId: 't1',
      teachingDayIndices: Array.from({ length: 50 }, (_, i) => i + 1),
      themes: DEFAULT_PRE_PRIMARY_THEMES,
    });
    expect(shrunk.length).toBe(50);
    expect(full.length).toBe(60);
    expect(shrunk.every((s) => s.outcomeId.length > 0)).toBe(true);
  });

  it('returns empty for empty teaching days', () => {
    expect(
      placeThemesOnTeachingDays({
        terminalId: 't1',
        teachingDayIndices: [],
        themes: DEFAULT_PRE_PRIMARY_THEMES,
      }),
    ).toEqual([]);
  });
});
