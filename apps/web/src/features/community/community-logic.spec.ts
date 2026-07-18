import { describe, expect, it } from 'vitest';
import { methodLabel } from './community-logic';

describe('community-logic', () => {
  it('humanizes a snake_case method tag', () => {
    expect(methodLabel('peer_practice')).toBe('Peer Practice');
    expect(methodLabel('routine')).toBe('Routine');
  });
});
