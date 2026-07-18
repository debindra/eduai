import { describe, expect, it } from 'vitest';
import { buildCacheKey, isCacheable } from './cache-key';

describe('cache-key', () => {
  it('marks configured features cacheable and others not', () => {
    expect(isCacheable('methods_toolkit')).toBe(true);
    expect(isCacheable('outcome_mapper')).toBe(false);
    expect(isCacheable('monthly_parent_report')).toBe(false);
  });

  it('key is stable for identical content vars', () => {
    const a = buildCacheKey('methods_toolkit', 'band-1', {
      activity_type: 'peer_practice',
      outcome_statement: 'counts to 20',
    });
    const b = buildCacheKey('methods_toolkit', 'band-1', {
      activity_type: 'peer_practice',
      outcome_statement: 'counts to 20',
    });
    expect(a).toBe(b);
  });

  it('key ignores non-allowlisted identifiers (child/tier)', () => {
    const withoutIds = buildCacheKey('methods_toolkit', 'band-1', {
      activity_type: 'peer_practice',
      outcome_statement: 'counts to 20',
    });
    const withIds = buildCacheKey('methods_toolkit', 'band-1', {
      activity_type: 'peer_practice',
      outcome_statement: 'counts to 20',
      child_name: 'Nisha',
      school_tier: 'pro',
    });
    expect(withIds).toBe(withoutIds);
  });

  it('key changes when a cache-relevant var changes', () => {
    const a = buildCacheKey('methods_toolkit', 'band-1', {
      activity_type: 'peer_practice',
      outcome_statement: 'counts to 20',
    });
    const b = buildCacheKey('methods_toolkit', 'band-1', {
      activity_type: 'reteach_small_group',
      outcome_statement: 'counts to 20',
    });
    expect(a).not.toBe(b);
  });

  it('key changes when the band changes', () => {
    const a = buildCacheKey('methods_toolkit', 'band-1', { activity_type: 'x', outcome_statement: 'y' });
    const b = buildCacheKey('methods_toolkit', 'band-2', { activity_type: 'x', outcome_statement: 'y' });
    expect(a).not.toBe(b);
  });
});
