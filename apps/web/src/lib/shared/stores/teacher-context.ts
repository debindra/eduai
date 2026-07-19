import { derived, get, writable } from 'svelte/store';
import {
  fetchTeacherContext,
  type TeacherAssignment,
  type TeacherContextResponse,
} from '../api/teacher-context-api';

export const TEACHER_SELECTION_STORAGE_KEY = 'eduai.teacher.selection';

export type TeacherContextState = {
  teacherId: string;
  assignments: TeacherAssignment[];
  selected: TeacherAssignment | null;
} | null;

type StoredSelection = {
  sectionId: string;
  subjectId: string | null;
};

function assignmentKey(a: Pick<TeacherAssignment, 'sectionId' | 'subjectId'>): string {
  return `${a.sectionId}::${a.subjectId ?? 'null'}`;
}

/** Prefer class-teacher row; else first assignment. */
export function pickDefaultAssignment(
  assignments: TeacherAssignment[],
): TeacherAssignment | null {
  if (assignments.length === 0) return null;
  return assignments.find((a) => a.isClassTeacher) ?? assignments[0] ?? null;
}

export function findAssignment(
  assignments: TeacherAssignment[],
  sectionId: string,
  subjectId: string | null,
): TeacherAssignment | null {
  return (
    assignments.find(
      (a) => a.sectionId === sectionId && a.subjectId === subjectId,
    ) ?? null
  );
}

function readStoredSelection(): StoredSelection | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(TEACHER_SELECTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSelection;
    if (!parsed || typeof parsed.sectionId !== 'string') return null;
    return {
      sectionId: parsed.sectionId,
      subjectId: parsed.subjectId ?? null,
    };
  } catch {
    localStorage.removeItem(TEACHER_SELECTION_STORAGE_KEY);
    return null;
  }
}

function writeStoredSelection(selected: TeacherAssignment | null): void {
  if (typeof localStorage === 'undefined') return;
  if (!selected) {
    localStorage.removeItem(TEACHER_SELECTION_STORAGE_KEY);
    return;
  }
  localStorage.setItem(
    TEACHER_SELECTION_STORAGE_KEY,
    JSON.stringify({
      sectionId: selected.sectionId,
      subjectId: selected.subjectId,
    } satisfies StoredSelection),
  );
}

export function resolveSelection(
  assignments: TeacherAssignment[],
  stored: StoredSelection | null,
): TeacherAssignment | null {
  if (stored) {
    const match = findAssignment(assignments, stored.sectionId, stored.subjectId);
    if (match) return match;
  }
  return pickDefaultAssignment(assignments);
}

export const teacherContext = writable<TeacherContextState>(null);

export const selectedAssignment = derived(
  teacherContext,
  ($ctx) => $ctx?.selected ?? null,
);

export const selectedSectionId = derived(
  selectedAssignment,
  ($sel) => $sel?.sectionId ?? null,
);

/** Changes when section or subject grain changes — use in page $effects. */
export const selectedAssignmentKey = derived(selectedAssignment, ($sel) =>
  $sel ? assignmentKey($sel) : null,
);

export function clearTeacherContext(): void {
  writeStoredSelection(null);
  teacherContext.set(null);
}

export async function loadTeacherContext(): Promise<TeacherContextState> {
  const response: TeacherContextResponse = await fetchTeacherContext();
  const stored = readStoredSelection();
  const selected = resolveSelection(response.assignments, stored);
  writeStoredSelection(selected);
  const next: TeacherContextState = {
    teacherId: response.teacherId,
    assignments: response.assignments,
    selected,
  };
  teacherContext.set(next);
  return next;
}

export function selectAssignment(sectionId: string, subjectId: string | null): void {
  const ctx = get(teacherContext);
  if (!ctx) {
    throw new Error('Teacher context not loaded');
  }
  const match = findAssignment(ctx.assignments, sectionId, subjectId);
  if (!match) {
    throw new Error('Assignment not found in teacher context');
  }
  writeStoredSelection(match);
  teacherContext.set({ ...ctx, selected: match });
}

export function selectAssignmentByKey(key: string): void {
  const ctx = get(teacherContext);
  if (!ctx) {
    throw new Error('Teacher context not loaded');
  }
  const match = ctx.assignments.find((a) => assignmentKey(a) === key);
  if (!match) {
    throw new Error('Assignment not found in teacher context');
  }
  writeStoredSelection(match);
  teacherContext.set({ ...ctx, selected: match });
}

export function assignmentOptionKey(a: TeacherAssignment): string {
  return assignmentKey(a);
}

export function assignmentLabel(a: TeacherAssignment): string {
  const subject = a.subjectName ?? (a.isClassTeacher ? 'Class teacher' : 'Section');
  return `${a.sectionName} — ${subject}`;
}

export function requireSectionId(): string {
  const sectionId = get(selectedAssignment)?.sectionId;
  if (!sectionId) {
    throw new Error('Not signed in as teacher — section context missing');
  }
  return sectionId;
}

export function requireBandId(): string {
  const bandId = get(selectedAssignment)?.bandId;
  if (!bandId) {
    throw new Error('Not signed in as teacher — band context missing');
  }
  return bandId;
}

/** Returns null for pre-primary (subject_id IS NULL) — not an error. */
export function getSelectedSubjectId(): string | null {
  return get(selectedAssignment)?.subjectId ?? null;
}

export function requireSubjectId(): string {
  const subjectId = getSelectedSubjectId();
  if (!subjectId) {
    throw new Error('Selected assignment has no subject — pick a subject-teacher grain');
  }
  return subjectId;
}
