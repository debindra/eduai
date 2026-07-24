import { describe, expect, it } from 'vitest';
import { applyLandscapeFix, landscapePageSize } from './landscape-fix';
import { hashSourceRows } from './source-hash';

describe('applyLandscapeFix', () => {
  it('swaps width and height so library landscape quirk yields correct size', () => {
    const fixed = applyLandscapeFix({ width: 100, height: 200 });
    expect(fixed).toEqual({ width: 200, height: 100 });
  });

  it('landscapePageSize returns swapped A4 dimensions', () => {
    const size = landscapePageSize();
    expect(size.width).toBeGreaterThan(size.height);
  });
});

describe('hashSourceRows', () => {
  it('is idempotent for the same source rows', () => {
    const rows = {
      child: { id: 'c1', name: 'Priya' },
      outcomes: [{ id: 'o1', rating_code: 'not_yet' }],
    };
    expect(hashSourceRows(rows)).toBe(hashSourceRows(rows));
  });

  it('changes when source rows change', () => {
    const a = hashSourceRows({ rating: 'not_yet' });
    const b = hashSourceRows({ rating: 'developing' });
    expect(a).not.toBe(b);
  });

  it('is key-order independent', () => {
    expect(hashSourceRows({ a: 1, b: 2 })).toBe(hashSourceRows({ b: 2, a: 1 }));
  });
});
