import type { NationalClosure } from './api';
import { bsMonthLength, bsToAd } from '@eduai/bs-date';

export type ClosureDraft = {
  name: string;
  category: NationalClosure['category'];
  startDate: string;
  endDate: string;
  movable: boolean;
};

export type ClosurePayloadItem = {
  id?: string;
  name: string;
  category: NationalClosure['category'];
  startDate: string;
  endDate: string;
  bsLabel?: string | null;
  movable?: boolean;
};

/** A draft closure is only submittable once name and both dates are present. */
export function isClosureDraftComplete(
  draft: Pick<ClosureDraft, 'name' | 'startDate' | 'endDate'>,
): boolean {
  return Boolean(draft.name && draft.startDate && draft.endDate);
}

/**
 * Build the closures PATCH payload: existing closures carried forward verbatim
 * plus the new draft appended.
 */
export function buildClosurePayload(
  existing: NationalClosure[],
  draft: ClosureDraft,
): ClosurePayloadItem[] {
  return [
    ...existing.map((closure) => ({
      id: closure.id,
      name: closure.name,
      category: closure.category,
      startDate: closure.startDate,
      endDate: closure.endDate,
      bsLabel: closure.bsLabel,
      movable: closure.movable,
    })),
    {
      name: draft.name,
      category: draft.category,
      startDate: draft.startDate,
      endDate: draft.endDate,
      movable: draft.movable,
    },
  ];
}

/** Full-replace payload from the editable board list (add / edit / delete). */
export function buildClosuresReplacePayload(
  closures: Array<{
    id?: string;
    name: string;
    category: NationalClosure['category'];
    startDate: string;
    endDate: string;
    bsLabel?: string | null;
    movable?: boolean;
  }>,
): ClosurePayloadItem[] {
  return closures.map((closure) => ({
    id: closure.id,
    name: closure.name,
    category: closure.category,
    startDate: closure.startDate,
    endDate: closure.endDate,
    bsLabel: closure.bsLabel ?? null,
    movable: closure.movable ?? true,
  }));
}

/** AD span covering a full BS year — used to paint national weekly-off markers. */
export function bsYearAdSessionSpan(bsYear: number): {
  sessionStart: string;
  sessionEnd: string;
} {
  return {
    sessionStart: bsToAd(bsYear, 1, 1),
    sessionEnd: bsToAd(bsYear, 12, bsMonthLength(bsYear, 12)),
  };
}

/** Normalize ISO weekly offs for API (1=Mon … 7=Sun); default Saturday. */
export function normalizeIsoWeeklyOffs(isoWeekdays: number[]): number[] {
  const unique = [
    ...new Set(isoWeekdays.filter((d) => Number.isInteger(d) && d >= 1 && d <= 7)),
  ].sort((a, b) => a - b);
  return unique.length > 0 ? unique : [6];
}
