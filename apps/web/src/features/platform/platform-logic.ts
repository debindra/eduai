/**
 * Client gravity-safe asserts for platform monitoring payloads.
 * UX only — API already strips forbidden keys.
 */

const FORBIDDEN_KEYS = new Set([
  'ratings',
  'bandDistributions',
  'childNames',
  'ratingDistribution',
  'bandDistribution',
  'studentNames',
  'outcomeRatings',
]);

export function assertGravitySafe(value: unknown, path = 'root'): string[] {
  const violations: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      violations.push(...assertGravitySafe(item, `${path}[${index}]`));
    });
    return violations;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (FORBIDDEN_KEYS.has(key)) {
        violations.push(`${path}.${key}`);
      } else {
        violations.push(...assertGravitySafe(nested, `${path}.${key}`));
      }
    }
  }
  return violations;
}
