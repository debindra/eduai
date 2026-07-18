import { describe, expect, it } from 'vitest';
import { reportUiBranch } from './report-logic';

describe('report-logic', () => {
  it('branches thin data to fallback', () => {
    expect(reportUiBranch(true)).toBe('fallback');
    expect(reportUiBranch(false)).toBe('draft');
  });
});
