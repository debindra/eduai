/**
 * Pure BS↔AD conversion helpers wrapping nepali-datetime.
 * No network calls at runtime. Library choice: nepali-datetime (confirmed Phase 7).
 *
 * Our public API uses 1-based months (1=Baisakh / January).
 * NepaliDate uses 0-based months — convert at the boundary.
 */

import NepaliDate from 'nepali-datetime';

export const BS_DATE_PACKAGE_VERSION = '0.1.0';

/** Inclusive BS year bounds supported by nepali-datetime (typical). */
export const BS_YEAR_MIN = 1970;
export const BS_YEAR_MAX = 2100;

export type BsDateParts = {
  bsYear: number;
  /** 1-based month (1 = Baisakh … 12 = Chaitra). */
  bsMonth: number;
  bsDay: number;
};

const BS_MONTH_NAMES_EN = [
  'Baisakh',
  'Jestha',
  'Ashadh',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
] as const;

function parseIsoDate(isoDate: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) {
    throw new Error(`Invalid AD ISO date: ${isoDate}`);
  }
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** Convert an AD ISO date (YYYY-MM-DD) to Bikram Sambat parts (1-based month). */
export function adToBs(isoDate: string): BsDateParts {
  const { year, month, day } = parseIsoDate(isoDate);
  // UTC noon avoids timezone edge cases around midnight.
  const ad = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const nd = new NepaliDate(ad);
  return {
    bsYear: nd.getYear(),
    bsMonth: nd.getMonth() + 1,
    bsDay: nd.getDate(),
  };
}

/** Convert BS year/month/day (1-based month) to AD ISO date. */
export function bsToAd(bsYear: number, bsMonth: number, bsDay: number): string {
  if (bsMonth < 1 || bsMonth > 12) {
    throw new Error(`Invalid BS month: ${bsMonth}`);
  }
  const nd = new NepaliDate(bsYear, bsMonth - 1, bsDay);
  const ad = nd.getDateObject();
  return formatIsoDate(ad.getFullYear(), ad.getMonth() + 1, ad.getDate());
}

/** Number of days in a BS month (29–32). Month is 1-based. */
export function bsMonthLength(bsYear: number, bsMonth: number): number {
  if (bsMonth < 1 || bsMonth > 12) {
    throw new Error(`Invalid BS month: ${bsMonth}`);
  }
  return NepaliDate.getDaysOfMonth(bsYear, bsMonth - 1);
}

/** BS year containing the given AD ISO date. */
export function bsYearForAdDate(isoDate: string): number {
  return adToBs(isoDate).bsYear;
}

/** English transliteration of BS month name (1-based). */
export function bsMonthName(bsMonth: number): string {
  if (bsMonth < 1 || bsMonth > 12) {
    throw new Error(`Invalid BS month: ${bsMonth}`);
  }
  return BS_MONTH_NAMES_EN[bsMonth - 1]!;
}

/** ISO day-of-week for a BS date: 1=Mon … 7=Sun (ISO). */
export function bsDayOfWeekIso(bsYear: number, bsMonth: number, bsDay: number): number {
  const ad = bsToAd(bsYear, bsMonth, bsDay);
  const { year, month, day } = parseIsoDate(ad);
  const jsDay = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0=Sun
  return jsDay === 0 ? 7 : jsDay;
}

/** Devanagari digits for display (optional UI helper). */
export function toDevanagariNumerals(value: number | string): string {
  const map = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return String(value).replace(/\d/g, (d) => map[Number(d)]!);
}
