/**
 * Pure licence-range helpers for the out-of-segment demand signal (P5-API-02).
 *
 * `schools.licensed_band_range` is free text today. It is treated as a
 * comma-separated set of band codes (a single value = that one band). The band
 * hierarchy is exported for callers that later want inclusive-range semantics,
 * but membership is the current check.
 */
export const BAND_ORDER = ['pre_primary', 'basic_early', 'basic_upper'] as const;

export function parseLicensedBands(licensedRange: string | null | undefined): string[] {
  if (!licensedRange) return [];
  return licensedRange
    .split(',')
    .map((code) => code.trim().toLowerCase())
    .filter((code) => code.length > 0);
}

/**
 * True when the requested band is within the school's licence. An empty/unset
 * licence is treated as unrestricted (return true) so unconfigured schools do
 * not flood the demand-signal log.
 */
export function isBandLicensed(
  requestedBandCode: string,
  licensedRange: string | null | undefined,
): boolean {
  const licensed = parseLicensedBands(licensedRange);
  if (licensed.length === 0) return true;
  return licensed.includes(requestedBandCode.trim().toLowerCase());
}
