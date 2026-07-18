import { describe, expect, it } from 'vitest';
import { mergeWeeklyOverride } from './weekly-logic';

describe('weekly-logic', () => {
  it('override wins over base theme', () => {
    expect(mergeWeeklyOverride('Animals', 'Letters')).toBe('Letters');
    expect(mergeWeeklyOverride('Animals', null)).toBe('Animals');
  });
});
