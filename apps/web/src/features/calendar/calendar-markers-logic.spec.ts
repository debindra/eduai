import { describe, expect, it } from 'vitest';
import {
  buildMarkedDates,
  closureCategoryLabel,
  closureLegendItems,
  enumerateInclusiveDates,
  enumerateWeeklyOffDates,
  isoWeekdayForAdDate,
  toneForCategory,
  weeklyOffLegendLabel,
} from './calendar-markers-logic';

describe('enumerateInclusiveDates', () => {
  it('expands a single day', () => {
    expect(enumerateInclusiveDates('2025-10-02', '2025-10-02')).toEqual(['2025-10-02']);
  });

  it('expands an inclusive range', () => {
    expect(enumerateInclusiveDates('2025-10-02', '2025-10-04')).toEqual([
      '2025-10-02',
      '2025-10-03',
      '2025-10-04',
    ]);
  });

  it('returns empty for invalid or inverted ranges', () => {
    expect(enumerateInclusiveDates('bad', '2025-10-02')).toEqual([]);
    expect(enumerateInclusiveDates('2025-10-04', '2025-10-02')).toEqual([]);
  });
});

describe('enumerateWeeklyOffDates', () => {
  it('marks Saturdays (ISO 6) within the session', () => {
    // 2025-10-04 is Saturday, 2025-10-05 is Sunday
    expect(isoWeekdayForAdDate('2025-10-04')).toBe(6);
    expect(isoWeekdayForAdDate('2025-10-05')).toBe(7);
    expect(enumerateWeeklyOffDates('2025-10-01', '2025-10-07', [6])).toEqual(['2025-10-04']);
  });

  it('marks Saturday and Sunday when both are weekly offs', () => {
    expect(enumerateWeeklyOffDates('2025-10-01', '2025-10-07', [6, 7])).toEqual([
      '2025-10-04',
      '2025-10-05',
    ]);
  });
});

describe('toneForCategory', () => {
  it('maps national holidays and days off to red', () => {
    expect(toneForCategory('govt_holiday')).toBe('red');
    expect(toneForCategory('day_off')).toBe('red');
  });

  it('maps festival to amber, school_holiday to violet, eca/cca to green', () => {
    expect(toneForCategory('festival')).toBe('amber');
    expect(toneForCategory('school_holiday')).toBe('violet');
    expect(toneForCategory('eca')).toBe('green');
    expect(toneForCategory('cca')).toBe('green');
  });

  it('labels eca and cca as one ECA/CCA type', () => {
    expect(closureCategoryLabel('eca')).toBe(
      'ECA (Extra Curricular)/CCA (Co-Curricular)',
    );
    expect(closureCategoryLabel('cca')).toBe(
      'ECA (Extra Curricular)/CCA (Co-Curricular)',
    );
    expect(closureCategoryLabel('govt_holiday')).toBe('Government holiday');
  });
});

describe('buildMarkedDates', () => {
  it('marks national and local closures by day with tones', () => {
    const marked = buildMarkedDates(
      [
        {
          name: 'Republic Day',
          startDate: '2025-10-02',
          endDate: '2025-10-03',
          category: 'govt_holiday',
        },
      ],
      [
        {
          name: 'Sports',
          startDate: '2025-06-01',
          endDate: '2025-06-01',
          category: 'eca',
        },
      ],
    );
    expect(marked['2025-10-02']).toEqual({ label: 'Republic Day', tone: 'red' });
    expect(marked['2025-10-03']).toEqual({ label: 'Republic Day', tone: 'red' });
    expect(marked['2025-06-01']).toEqual({ label: 'Sports', tone: 'green' });
  });

  it('marks weekly offs red and lets named closures replace the label', () => {
    const marked = buildMarkedDates(
      [
        {
          name: 'Dashain',
          startDate: '2025-10-04',
          endDate: '2025-10-04',
          category: 'festival',
        },
      ],
      [],
      {
        sessionStart: '2025-10-01',
        sessionEnd: '2025-10-07',
        isoWeekdays: [6, 7],
      },
    );
    expect(marked['2025-10-05']).toEqual({ label: 'Weekly off', tone: 'red' });
    // Label becomes the festival name; tone stays red (weekly off / day_off priority).
    expect(marked['2025-10-04']).toEqual({ label: 'Dashain', tone: 'red' });
  });

  it('joins overlapping names and keeps highest-priority tone', () => {
    const marked = buildMarkedDates(
      [
        {
          name: 'Dashain',
          startDate: '2025-10-02',
          endDate: '2025-10-02',
          category: 'festival',
        },
      ],
      [
        {
          name: 'Local note',
          startDate: '2025-10-02',
          endDate: '2025-10-02',
          category: 'school_holiday',
        },
      ],
    );
    expect(marked['2025-10-02']?.label).toContain('Local note');
    expect(marked['2025-10-02']?.label).toContain('Dashain');
    expect(marked['2025-10-02']?.tone).toBe('amber');
  });

  it('prefers red over green when govt holiday overlaps ECA', () => {
    const marked = buildMarkedDates(
      [
        {
          name: 'Holiday',
          startDate: '2025-10-02',
          endDate: '2025-10-02',
          category: 'govt_holiday',
        },
      ],
      [{ name: 'ECA', startDate: '2025-10-02', endDate: '2025-10-02', category: 'eca' }],
    );
    expect(marked['2025-10-02']?.tone).toBe('red');
  });
});

describe('closureLegendItems', () => {
  it('lists weekly offs then national then local with source and tone', () => {
    expect(
      closureLegendItems(
        [
          {
            name: 'Dashain',
            startDate: '2025-10-02',
            endDate: '2025-10-12',
            category: 'festival',
          },
        ],
        [{ name: 'PD', startDate: '2025-06-01', endDate: '2025-06-01', category: 'school_holiday' }],
        {
          sessionStart: '2025-04-14',
          sessionEnd: '2026-04-13',
          isoWeekdays: [6, 7],
        },
      ),
    ).toEqual([
      {
        name: weeklyOffLegendLabel([6, 7]),
        startDate: '2025-04-14',
        endDate: '2026-04-13',
        source: 'weekly',
        category: 'day_off',
        tone: 'red',
      },
      {
        name: 'Dashain',
        startDate: '2025-10-02',
        endDate: '2025-10-12',
        source: 'national',
        category: 'festival',
        tone: 'amber',
      },
      {
        name: 'PD',
        startDate: '2025-06-01',
        endDate: '2025-06-01',
        source: 'local',
        category: 'school_holiday',
        tone: 'violet',
      },
    ]);
  });
});
