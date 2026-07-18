import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRE_PRIMARY_THEMES,
  placeThemesOnTeachingDays,
} from '../yearly-map/placement';
import { computePacingState } from '../pacing/pacing.service';

/**
 * P1-TEST-01 — Dashain-length closure reflows map + pacing (self-correcting).
 * Pure deterministic check: fewer teaching days → fewer slices; catch-up → self_correcting.
 */
describe('P1-TEST-01 Dashain closure reflow', () => {
  it('reflows map slices when teaching days shrink without AI', () => {
    const before = placeThemesOnTeachingDays({
      terminalId: 't2',
      teachingDayIndices: Array.from({ length: 70 }, (_, i) => i + 1),
      themes: DEFAULT_PRE_PRIMARY_THEMES,
    });
    // Dashain removes ~10 teaching days from the terminal
    const after = placeThemesOnTeachingDays({
      terminalId: 't2',
      teachingDayIndices: Array.from({ length: 60 }, (_, i) => i + 1),
      themes: DEFAULT_PRE_PRIMARY_THEMES,
    });

    expect(after.length).toBe(60);
    expect(before.length).toBe(70);
    expect(after.every((s) => s.themeOrChapter.length > 0)).toBe(true);
  });

  it('pacing becomes self_correcting after catch-up without manual re-plan', () => {
    const behind = computePacingState({
      plannedIndex: 40,
      actualDone: 30,
      previouslyBehind: false,
    });
    expect(behind.state).toBe('behind');

    const caughtUp = computePacingState({
      plannedIndex: 40,
      actualDone: 40,
      previouslyBehind: true,
    });
    expect(caughtUp.state).toBe('self_correcting');
  });
});
