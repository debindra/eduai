import { describe, expect, it } from 'vitest';
import {
  isDraftCalendarAlreadyExistsError,
  isDraftCalendarNotFoundError,
  resolveWizardStepFromStatus,
  toIsoWeekday,
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
      }),
    ).toEqual({ action: 'festivals', calendarId: 'cal-1' });
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
