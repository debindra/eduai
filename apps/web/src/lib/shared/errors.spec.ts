import { describe, expect, it } from 'vitest';
import { toErrorMessage } from './errors';

describe('toErrorMessage', () => {
  it('returns the Error message when given an Error', () => {
    expect(toErrorMessage(new Error('boom'), 'fallback')).toBe('boom');
  });

  it('returns the fallback for a non-Error value', () => {
    expect(toErrorMessage('some string', 'fallback')).toBe('fallback');
    expect(toErrorMessage(undefined, 'fallback')).toBe('fallback');
    expect(toErrorMessage({ message: 'not an Error' }, 'fallback')).toBe('fallback');
  });
});
