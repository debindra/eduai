import { describe, expect, it } from 'vitest';
import { isBandLicensed, parseLicensedBands } from './out-of-segment-logic';

describe('out-of-segment logic', () => {
  it('parses a comma-separated licence into normalized codes', () => {
    expect(parseLicensedBands('pre_primary, basic_early')).toEqual([
      'pre_primary',
      'basic_early',
    ]);
  });

  it('licenses a band that is in the set', () => {
    expect(isBandLicensed('pre_primary', 'pre_primary')).toBe(true);
    expect(isBandLicensed('basic_early', 'pre_primary,basic_early')).toBe(true);
  });

  it('flags a band outside the licence', () => {
    expect(isBandLicensed('basic_upper', 'pre_primary')).toBe(false);
    expect(isBandLicensed('basic_early', 'pre_primary')).toBe(false);
  });

  it('treats an empty/unset licence as unrestricted (no demand-signal spam)', () => {
    expect(isBandLicensed('basic_upper', null)).toBe(true);
    expect(isBandLicensed('basic_upper', '')).toBe(true);
  });
});
