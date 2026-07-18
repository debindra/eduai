import { createHash } from 'node:crypto';

/**
 * Content-only cache config. Cache key is derived from (feature, band, keyVars)
 * ONLY — never child, teacher, school, or tier identifiers (invariant: cache is
 * content-keyed, shared across teachers/tiers). A feature is cacheable iff it
 * appears here with an explicit allowlist of cache-relevant variables.
 */
export const CACHE_CONFIG: Record<string, { keyVars: string[]; ttlSeconds: number }> = {
  methods_toolkit: {
    keyVars: ['activity_type', 'outcome_statement'],
    ttlSeconds: 30 * 24 * 60 * 60,
  },
  lesson_generator: {
    keyVars: ['map_slice_json', 'band_id', 'teacher_experience_signal'],
    ttlSeconds: 30 * 24 * 60 * 60,
  },
  catch_up_reteach: {
    keyVars: ['missed_themes'],
    ttlSeconds: 30 * 24 * 60 * 60,
  },
};

/** Remedial-activity cache is tracked as its own line in metrics (P5-API-01). */
export const REMEDIAL_ACTIVITY_FEATURE = 'methods_toolkit';

export function isCacheable(featureId: string): boolean {
  return featureId in CACHE_CONFIG;
}

/** Deterministic content hash of only the allowlisted, cache-relevant variables. */
export function buildCacheKey(
  featureId: string,
  bandId: string,
  variables: Record<string, string>,
): string {
  const config = CACHE_CONFIG[featureId];
  const keyVars = config?.keyVars ?? [];
  const normalized: Record<string, string> = {};
  for (const name of [...keyVars].sort()) {
    normalized[name] = variables[name] ?? '';
  }
  const payload = JSON.stringify({ featureId, bandId, vars: normalized });
  const hash = createHash('sha256').update(payload).digest('hex');
  return `ai:${featureId}:${bandId}:${hash}`;
}
