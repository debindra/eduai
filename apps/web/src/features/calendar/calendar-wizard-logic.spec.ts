import { describe, expect, it } from 'vitest';
import {
  bsYearFromAcademicLabel,
  defaultAcademicYearLabel,
  defaultFirstTerminal,
  defaultSessionBounds,
  defaultSessionBoundsFromLabel,
  applySessionBoundsToTerminals,
  isDraftCalendarAlreadyExistsError,
  isDraftCalendarNotFoundError,
  nationalMatchMessage,
  nationalMatchStatus,
  resolveTargetBsYear,
  resolveWizardStepFromStatus,
  sessionBsYearMismatch,
  toIsoWeekday,
  fromIsoWeekday,
} from './calendar-wizard-logic';

describe('toIsoWeekday', () => {
  it('maps Sunday (0) to ISO 7', () => {
    expect(toIsoWeekday(0)).toBe(7);
  });

  it('maps Monday–Saturday (1–6) unchanged', () => {
    expect(toIsoWeekday(1)).toBe(1);
    expect(toIsoWeekday(6)).toBe(6);
  });
});

describe('fromIsoWeekday', () => {
  it('round-trips with toIsoWeekday', () => {
    for (const js of [0, 1, 2, 3, 4, 5, 6]) {
      expect(fromIsoWeekday(toIsoWeekday(js))).toBe(js);
    }
  });
});

describe('bsYearFromAcademicLabel', () => {
  it('parses leading BS year from slash labels', () => {
    expect(bsYearFromAcademicLabel('2082/83')).toBe(2082);
    expect(bsYearFromAcademicLabel('2082')).toBe(2082);
  });

  it('returns null for non-year labels', () => {
    expect(bsYearFromAcademicLabel('')).toBeNull();
    expect(bsYearFromAcademicLabel('year-a')).toBeNull();
  });
});

describe('resolveTargetBsYear', () => {
  it('aliases bsYearFromAcademicLabel', () => {
    expect(resolveTargetBsYear('2082/83')).toBe(2082);
  });
});

describe('defaultAcademicYearLabel', () => {
  it('builds slash label from a known AD date in BS 2082', () => {
    // 2025-04-14 is Baisakh 1 2082 in nepali-datetime.
    expect(defaultAcademicYearLabel('2025-04-14')).toBe('2082/83');
  });
});

describe('defaultSessionBounds', () => {
  it('defaults start to Baisakh 1 and end to last day of Chaitra', () => {
    const bounds = defaultSessionBounds(2082);
    expect(bounds).not.toBeNull();
    expect(bounds!.sessionStart).toBe('2025-04-14');
    // Chaitra 2082 ends the day before Baisakh 1 2083.
    expect(bounds!.sessionEnd).toBe('2026-04-13');
  });

  it('returns null for missing year', () => {
    expect(defaultSessionBounds(null)).toBeNull();
  });

  it('derives from academic label', () => {
    expect(defaultSessionBoundsFromLabel('2082/83')).toEqual(defaultSessionBounds(2082));
  });
});

describe('defaultFirstTerminal / applySessionBoundsToTerminals', () => {
  it('builds terminal 1 covering the full session', () => {
    const bounds = defaultSessionBounds(2082)!;
    expect(defaultFirstTerminal(bounds)).toEqual({
      name: 'Terminal 1',
      startDate: '2025-04-14',
      endDate: '2026-04-13',
      reportingType: 'formative',
    });
  });

  it('syncs a single terminal to session bounds', () => {
    const bounds = defaultSessionBounds(2082)!;
    expect(
      applySessionBoundsToTerminals(
        [{ name: 'T1', startDate: '', endDate: '', reportingType: 'formative' }],
        bounds,
        { syncSingleTerminal: true },
      ),
    ).toEqual([
      {
        name: 'T1',
        startDate: '2025-04-14',
        endDate: '2026-04-13',
        reportingType: 'formative',
      },
    ]);
  });

  it('only fills blank dates when multiple terminals exist', () => {
    const bounds = defaultSessionBounds(2082)!;
    expect(
      applySessionBoundsToTerminals(
        [
          {
            name: 'T1',
            startDate: '2025-04-14',
            endDate: '2025-08-01',
            reportingType: 'formative',
          },
          {
            name: 'T2',
            startDate: '',
            endDate: '',
            reportingType: 'summative',
          },
        ],
        bounds,
      ),
    ).toEqual([
      {
        name: 'T1',
        startDate: '2025-04-14',
        endDate: '2025-08-01',
        reportingType: 'formative',
      },
      {
        name: 'T2',
        startDate: '2025-04-14',
        endDate: '2026-04-13',
        reportingType: 'summative',
      },
    ]);
  });
});

describe('nationalMatchStatus', () => {
  it('returns matched when target year is published', () => {
    expect(
      nationalMatchStatus({ targetBsYear: 2082, publishedYears: [2081, 2082] }),
    ).toBe('matched');
  });

  it('returns missing when year absent or null', () => {
    expect(nationalMatchStatus({ targetBsYear: 2083, publishedYears: [2082] })).toBe(
      'missing',
    );
    expect(nationalMatchStatus({ targetBsYear: null, publishedYears: [2082] })).toBe(
      'missing',
    );
  });

  it('never treats a different published year as a match', () => {
    expect(nationalMatchStatus({ targetBsYear: 2082, publishedYears: [2081] })).toBe(
      'missing',
    );
  });
});

describe('nationalMatchMessage', () => {
  it('describes matched and missing states', () => {
    expect(nationalMatchMessage('matched', 2082)).toContain('2082');
    expect(nationalMatchMessage('missing', 2082)).toMatch(/will not apply/i);
    expect(nationalMatchMessage('missing', null)).toBeNull();
  });
});

describe('sessionBsYearMismatch', () => {
  it('is false when session start matches label year', () => {
    expect(sessionBsYearMismatch('2025-04-14', 2082)).toBe(false);
  });

  it('is true when session start is a different BS year', () => {
    // 2024-01-01 is still BS 2080.
    expect(sessionBsYearMismatch('2024-01-01', 2082)).toBe(true);
  });

  it('is false when session or target is empty', () => {
    expect(sessionBsYearMismatch('', 2082)).toBe(false);
    expect(sessionBsYearMismatch('2025-04-14', null)).toBe(false);
  });
});

describe('calendar error classifiers', () => {
  it('detects draft already exists', () => {
    expect(isDraftCalendarAlreadyExistsError('A draft calendar already exists')).toBe(
      true,
    );
    expect(isDraftCalendarAlreadyExistsError('Setup failed')).toBe(false);
  });

  it('detects draft not found', () => {
    expect(isDraftCalendarNotFoundError('Draft calendar not found for school')).toBe(
      true,
    );
    expect(isDraftCalendarNotFoundError('Could not load festival template')).toBe(
      false,
    );
  });
});

describe('resolveWizardStepFromStatus', () => {
  it('returns festivals step for draft with calendar id', () => {
    expect(
      resolveWizardStepFromStatus({
        approvalStatus: 'draft',
        schoolCalendarId: 'cal-1',
        hasLiveApproved: true,
      }),
    ).toEqual({
      action: 'festivals',
      calendarId: 'cal-1',
      hasLiveApproved: true,
    });
  });

  it('returns approved step for approved calendar', () => {
    expect(
      resolveWizardStepFromStatus({
        approvalStatus: 'approved',
        schoolCalendarId: 'cal-2',
        academicYearLabel: '2082/83',
      }),
    ).toEqual({
      action: 'approved',
      calendarId: 'cal-2',
      academicYearLabel: '2082/83',
      hasLiveApproved: true,
    });
  });

  it('returns null when status cannot resume the wizard', () => {
    expect(
      resolveWizardStepFromStatus({
        approvalStatus: 'draft',
        schoolCalendarId: null,
      }),
    ).toBeNull();
    expect(
      resolveWizardStepFromStatus({
        approvalStatus: 'none',
        schoolCalendarId: null,
      }),
    ).toBeNull();
  });
});
