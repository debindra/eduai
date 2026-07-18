/** Convert JS getDay() (0=Sun) to ISO weekday (1=Mon … 7=Sun). */
export function toIsoWeekday(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

export function isDraftCalendarAlreadyExistsError(message: string): boolean {
  return /draft calendar already exists/i.test(message);
}

export function isDraftCalendarNotFoundError(message: string): boolean {
  return /draft calendar not found/i.test(message);
}

export type CalendarStatusForWizard = {
  approvalStatus: string;
  schoolCalendarId: string | null;
  academicYearLabel?: string | null;
};

export type WizardResumeStep =
  | { action: 'festivals'; calendarId: string }
  | { action: 'approved'; calendarId: string; academicYearLabel: string | null }
  | null;

/** Resume wizard at festivals or approve step from calendar status on load. */
export function resolveWizardStepFromStatus(
  status: CalendarStatusForWizard,
): WizardResumeStep {
  if (status.approvalStatus === 'draft' && status.schoolCalendarId) {
    return { action: 'festivals', calendarId: status.schoolCalendarId };
  }
  if (status.approvalStatus === 'approved' && status.schoolCalendarId) {
    return {
      action: 'approved',
      calendarId: status.schoolCalendarId,
      academicYearLabel: status.academicYearLabel ?? null,
    };
  }
  return null;
}
