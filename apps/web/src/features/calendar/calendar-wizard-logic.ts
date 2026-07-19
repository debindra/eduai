export type ReportingType = 'formative' | 'summative' | 'transition';

export type SchoolClosureCategory = 'school_holiday' | 'eca' | 'cca';

export type TerminalDraft = {
  name: string;
  startDate: string;
  endDate: string;
  reportingType: ReportingType;
};

export type LocalClosure = {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  category: SchoolClosureCategory;
};

export type NationalClosure = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  category?: string;
};

/** Convert JS getDay() (0=Sun) to ISO weekday (1=Mon … 7=Sun). */
export function toIsoWeekday(jsDay: number): number {
  return jsDay === 0 ? 7 : jsDay;
}

/** Convert ISO weekday (1=Mon … 7=Sun) back to JS getDay() (0=Sun). */
export function fromIsoWeekday(isoDay: number): number {
  return isoDay === 7 ? 0 : isoDay;
}

/** Leading BS year from labels like `2082/83` or `2082`. */
export function bsYearFromAcademicLabel(label: string): number | null {
  const match = /^(\d{4})/.exec(label.trim());
  if (!match) return null;
  const year = Number(match[1]);
  return Number.isFinite(year) ? year : null;
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
  hasLiveApproved?: boolean;
};

export type WizardResumeStep =
  | { action: 'festivals'; calendarId: string; hasLiveApproved: boolean }
  | {
      action: 'approved';
      calendarId: string;
      academicYearLabel: string | null;
      hasLiveApproved: boolean;
    }
  | null;

/** Resume wizard at festivals or approve step from calendar status on load. */
export function resolveWizardStepFromStatus(
  status: CalendarStatusForWizard,
): WizardResumeStep {
  if (status.approvalStatus === 'draft' && status.schoolCalendarId) {
    return {
      action: 'festivals',
      calendarId: status.schoolCalendarId,
      hasLiveApproved: Boolean(status.hasLiveApproved),
    };
  }
  if (status.approvalStatus === 'approved' && status.schoolCalendarId) {
    return {
      action: 'approved',
      calendarId: status.schoolCalendarId,
      academicYearLabel: status.academicYearLabel ?? null,
      hasLiveApproved: true,
    };
  }
  return null;
}
