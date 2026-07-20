import { bsMonthLength, bsToAd, bsYearForAdDate } from '@eduai/bs-date';

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
  schoolActivityId?: string | null;
  iconKey?: string | null;
};

export type NationalClosure = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  category?: string;
};

export type NationalMatchStatus = 'matched' | 'missing';

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

/** Alias — academic label is the source of truth for national calendar match. */
export function resolveTargetBsYear(label: string): number | null {
  return bsYearFromAcademicLabel(label);
}

/**
 * Default academic year label from today's BS year (e.g. 2082 → `2082/83`).
 * Pass `todayIso` (YYYY-MM-DD) for deterministic tests.
 */
export function defaultAcademicYearLabel(todayIso?: string): string {
  const iso = todayIso ?? new Date().toISOString().slice(0, 10);
  const year = bsYearForAdDate(iso);
  const nextTwo = String((year + 1) % 100).padStart(2, '0');
  return `${year}/${nextTwo}`;
}

/**
 * Default session span for a BS year: Baisakh 1 → last day of Chaitra (AD ISO).
 * Returns null when `bsYear` is missing.
 */
export function defaultSessionBounds(
  bsYear: number | null,
): { sessionStart: string; sessionEnd: string } | null {
  if (bsYear == null || !Number.isFinite(bsYear)) return null;
  const chaitraDays = bsMonthLength(bsYear, 12);
  return {
    sessionStart: bsToAd(bsYear, 1, 1),
    sessionEnd: bsToAd(bsYear, 12, chaitraDays),
  };
}

/** Apply Baisakh–Chaitra defaults from an academic year label. */
export function defaultSessionBoundsFromLabel(
  label: string,
): { sessionStart: string; sessionEnd: string } | null {
  return defaultSessionBounds(resolveTargetBsYear(label));
}

/** First terminal covering the full session span. */
export function defaultFirstTerminal(bounds: {
  sessionStart: string;
  sessionEnd: string;
}): TerminalDraft {
  return {
    name: 'Terminal 1',
    startDate: bounds.sessionStart,
    endDate: bounds.sessionEnd,
    reportingType: 'formative',
  };
}

/**
 * Fill blank terminal dates from session bounds; if only one terminal exists,
 * keep it aligned with the full session when applying year defaults.
 */
export function applySessionBoundsToTerminals(
  terminals: TerminalDraft[],
  bounds: { sessionStart: string; sessionEnd: string },
  opts?: { syncSingleTerminal?: boolean },
): TerminalDraft[] {
  if (opts?.syncSingleTerminal && terminals.length === 1) {
    const only = terminals[0]!;
    return [
      {
        ...only,
        startDate: bounds.sessionStart,
        endDate: bounds.sessionEnd,
      },
    ];
  }
  return terminals.map((terminal) => ({
    ...terminal,
    startDate: terminal.startDate.trim() || bounds.sessionStart,
    endDate: terminal.endDate.trim() || bounds.sessionEnd,
  }));
}

/** Whether a published national calendar exists for the target BS year. */
export function nationalMatchStatus(input: {
  targetBsYear: number | null;
  publishedYears: number[];
}): NationalMatchStatus {
  if (input.targetBsYear == null) return 'missing';
  return input.publishedYears.includes(input.targetBsYear) ? 'matched' : 'missing';
}

/**
 * True when session_start's BS year differs from the academic-label target year.
 * Empty/invalid session start → false (not yet comparable).
 */
export function sessionBsYearMismatch(
  sessionStart: string,
  targetBsYear: number | null,
): boolean {
  if (!sessionStart.trim() || targetBsYear == null) return false;
  try {
    return bsYearForAdDate(sessionStart.trim()) !== targetBsYear;
  } catch {
    return false;
  }
}

/** User-facing national match line for setup. */
export function nationalMatchMessage(
  status: NationalMatchStatus,
  targetBsYear: number | null,
): string | null {
  if (targetBsYear == null) return null;
  if (status === 'matched') {
    return `Using published national calendar ${targetBsYear}`;
  }
  return `No published national calendar for ${targetBsYear} — national holidays will not apply until one is published`;
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
