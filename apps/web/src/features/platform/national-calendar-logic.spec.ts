import { describe, expect, it } from 'vitest';
import type { NationalClosure } from './api';
import {
  buildClosurePayload,
  isClosureDraftComplete,
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
