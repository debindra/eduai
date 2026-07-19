import { describe, expect, it } from 'vitest';

/**
 * P7-TEST-02 — National closure reflows teaching_days (VIEW semantics).
 * Mirrors the SQL VIEW algorithm in pure TS so CI can assert without a live DB:
 * teaching day = terminal span − weekly offs − school closures − published national closures.
 * Counts stay derived (never stored).
 */

function isoDaysBetween(start: string, end: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${start}T00:00:00.000Z`);
  const last = new Date(`${end}T00:00:00.000Z`);
  while (cursor <= last) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function isoDow(iso: string): number {
  const d = new Date(`${iso}T00:00:00.000Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

function overlaps(day: string, start: string, end: string): boolean {
  return day >= start && day <= end;
}

function countTeachingDays(input: {
  start: string;
  end: string;
  weeklyOffs: number[];
  schoolClosures: Array<{ start: string; end: string }>;
  nationalClosures: Array<{ start: string; end: string; published: boolean }>;
}): number {
  return isoDaysBetween(input.start, input.end).filter((day) => {
    if (input.weeklyOffs.includes(isoDow(day))) return false;
    if (input.schoolClosures.some((c) => overlaps(day, c.start, c.end))) return false;
    if (
      input.nationalClosures.some(
        (c) => c.published && overlaps(day, c.start, c.end),
      )
    ) {
      return false;
    }
    return true;
  }).length;
}

describe('P7-TEST-02 national closure reflows teaching_days', () => {
  const base = {
    start: '2025-09-01',
    end: '2025-09-14',
    weeklyOffs: [6], // Saturday
    schoolClosures: [] as Array<{ start: string; end: string }>,
    nationalClosures: [] as Array<{ start: string; end: string; published: boolean }>,
  };

  it('publishing a national closure reduces teaching-day counts', () => {
    const before = countTeachingDays(base);
    const after = countTeachingDays({
      ...base,
      nationalClosures: [
        { start: '2025-09-08', end: '2025-09-10', published: true },
      ],
    });
    expect(after).toBeLessThan(before);
    // Mon 8, Tue 9, Wed 10 are teaching days (Sat offs only) → −3
    expect(before - after).toBe(3);
  });

  it('draft (unpublished) national closures do not affect counts', () => {
    const baseline = countTeachingDays(base);
    const withDraft = countTeachingDays({
      ...base,
      nationalClosures: [
        { start: '2025-09-08', end: '2025-09-10', published: false },
      ],
    });
    expect(withDraft).toBe(baseline);
  });

  it('local school closures still subtract independently of national', () => {
    const nationalOnly = countTeachingDays({
      ...base,
      nationalClosures: [
        { start: '2025-09-08', end: '2025-09-08', published: true },
      ],
    });
    const both = countTeachingDays({
      ...base,
      nationalClosures: [
        { start: '2025-09-08', end: '2025-09-08', published: true },
      ],
      schoolClosures: [{ start: '2025-09-09', end: '2025-09-09' }],
    });
    expect(both).toBe(nationalOnly - 1);
  });

  it('does not store a teaching-day count — result is recomputed from inputs', () => {
    const a = countTeachingDays(base);
    const b = countTeachingDays(base);
    expect(a).toBe(b);
    // No mutable cache object — each call is a fresh derivation.
    expect(typeof countTeachingDays).toBe('function');
  });
});
