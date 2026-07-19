import type { NationalClosure } from './api';

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
