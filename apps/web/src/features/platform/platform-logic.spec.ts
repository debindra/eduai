import { describe, expect, it } from 'vitest';
import { assertGravitySafe } from './platform-logic';

describe('assertGravitySafe', () => {
  it('accepts count/shape payloads', () => {
    expect(
      assertGravitySafe({
        schools: [{ id: 's1', sectionsTotal: 3, sectionsBehind: 1 }],
      }),
    ).toEqual([]);
  });

  it('flags forbidden distribution and name keys', () => {
    const violations = assertGravitySafe({
      childNames: ['A'],
      nested: { bandDistributions: { a: 1 } },
    });
    expect(violations).toContain('root.childNames');
    expect(violations).toContain('root.nested.bandDistributions');
  });
});
