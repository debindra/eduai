import {
  applyMapperGuards,
  isAttendanceNonObservation,
} from '@eduai/ai';

export interface SectionChild {
  id: string;
  name: string;
  rollNumber: string;
}

export interface MapperObservationResult {
  routeToAttendance: boolean;
  childId: string | null;
  rollNumberCandidates: string[];
  nameAmbiguous: boolean;
  suggestedRating: string | null;
  blockedReason: string | null;
}

/** Shared mapper guards used by all four capture paths. */
export function resolveObservationAgainstRoster(
  observationText: string,
  children: SectionChild[],
  suggestedRating?: string | null,
): MapperObservationResult {
  if (isAttendanceNonObservation(observationText)) {
    return {
      routeToAttendance: true,
      childId: null,
      rollNumberCandidates: [],
      nameAmbiguous: false,
      suggestedRating: null,
      blockedReason: null,
    };
  }

  const lower = observationText.toLowerCase();
  const matches = children.filter((c) => {
    const first = c.name.split(/\s+/)[0]?.toLowerCase() ?? '';
    return first.length > 0 && lower.includes(first);
  });

  if (matches.length > 1) {
    const guard = applyMapperGuards({
      observationText,
      childNameAmbiguous: true,
      rollNumberCandidates: matches.map((m) => m.rollNumber),
      ratingCode: suggestedRating ?? 'emerging',
    });
    return {
      routeToAttendance: false,
      childId: null,
      rollNumberCandidates: matches.map((m) => m.rollNumber),
      nameAmbiguous: true,
      suggestedRating: null,
      blockedReason: guard.ok ? null : guard.errors.join('; '),
    };
  }

  if (matches.length === 0) {
    return {
      routeToAttendance: false,
      childId: null,
      rollNumberCandidates: children.map((c) => c.rollNumber),
      nameAmbiguous: true,
      suggestedRating: null,
      blockedReason: 'Could not resolve child — pick a roll number',
    };
  }

  const rating = suggestedRating ?? 'emerging';
  const guard = applyMapperGuards({
    observationText,
    childNameAmbiguous: false,
    ratingCode: rating,
  });
  if (!guard.ok) {
    return {
      routeToAttendance: false,
      childId: matches[0]!.id,
      rollNumberCandidates: [],
      nameAmbiguous: false,
      suggestedRating: 'emerging',
      blockedReason: guard.errors.join('; '),
    };
  }

  return {
    routeToAttendance: false,
    childId: matches[0]!.id,
    rollNumberCandidates: [],
    nameAmbiguous: false,
    suggestedRating: rating,
    blockedReason: null,
  };
}
