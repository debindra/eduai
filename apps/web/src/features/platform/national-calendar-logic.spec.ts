import { describe, expect, it } from 'vitest';
import type { NationalClosure } from './api';
import {
  buildClosurePayload,
  buildClosuresReplacePayload,
  bsYearAdSessionSpan,
  isClosureDraftComplete,
  normalizeIsoWeeklyOffs,
  type ClosureDraft,
} from './national-calendar-logic';

const existing: NationalClosure[] = [
  {
    id: 'c1',
    name: 'Dashain',
    category: 'festival',
    startDate: '2025-10-01',
    endDate: '2025-10-10',
    bsLabel: 'Ashwin',
    movable: true,
  },
];

const draft: ClosureDraft = {
  name: 'Constitution Day',
  category: 'govt_holiday',
  startDate: '2025-09-19',
  endDate: '2025-09-19',
  movable: false,
};

describe('isClosureDraftComplete', () => {
  it('is true when name and both dates are present', () => {
    expect(isClosureDraftComplete(draft)).toBe(true);
  });

  it('is false when any required field is missing', () => {
    expect(isClosureDraftComplete({ ...draft, name: '' })).toBe(false);
    expect(isClosureDraftComplete({ ...draft, startDate: '' })).toBe(false);
    expect(isClosureDraftComplete({ ...draft, endDate: '' })).toBe(false);
  });
});

describe('buildClosurePayload', () => {
  it('carries existing closures forward with their ids and appends the draft', () => {
    const payload = buildClosurePayload(existing, draft);

    expect(payload).toHaveLength(2);
    expect(payload[0]).toEqual({
      id: 'c1',
      name: 'Dashain',
      category: 'festival',
      startDate: '2025-10-01',
      endDate: '2025-10-10',
      bsLabel: 'Ashwin',
      movable: true,
    });
    expect(payload[1]).toEqual({
      name: 'Constitution Day',
      category: 'govt_holiday',
      startDate: '2025-09-19',
      endDate: '2025-09-19',
      movable: false,
    });
    expect(payload[1]).not.toHaveProperty('id');
  });
});

describe('buildClosuresReplacePayload', () => {
  it('maps the board list for a full replace PATCH', () => {
    expect(
      buildClosuresReplacePayload([
        {
          id: 'c1',
          name: 'Republic Day',
          category: 'govt_holiday',
          startDate: '2025-05-29',
          endDate: '2025-05-29',
          movable: false,
        },
        {
          name: 'New festival',
          category: 'festival',
          startDate: '2025-06-01',
          endDate: '2025-06-02',
        },
      ]),
    ).toEqual([
      {
        id: 'c1',
        name: 'Republic Day',
        category: 'govt_holiday',
        startDate: '2025-05-29',
        endDate: '2025-05-29',
        bsLabel: null,
        movable: false,
      },
      {
        id: undefined,
        name: 'New festival',
        category: 'festival',
        startDate: '2025-06-01',
        endDate: '2025-06-02',
        bsLabel: null,
        movable: true,
      },
    ]);
  });
});

describe('bsYearAdSessionSpan', () => {
  it('returns AD start/end covering BS year 2082', () => {
    expect(bsYearAdSessionSpan(2082)).toEqual({
      sessionStart: '2025-04-14',
      sessionEnd: '2026-04-13',
    });
  });
});

describe('normalizeIsoWeeklyOffs', () => {
  it('dedupes, sorts, and drops invalid weekdays', () => {
    expect(normalizeIsoWeeklyOffs([7, 6, 6, 0, 9])).toEqual([6, 7]);
  });

  it('defaults to Saturday when empty', () => {
    expect(normalizeIsoWeeklyOffs([])).toEqual([6]);
  });
});
