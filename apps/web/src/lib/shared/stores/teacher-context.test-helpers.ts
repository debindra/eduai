import {
  clearTeacherContext,
  teacherContext,
  type TeacherContextState,
} from './teacher-context';
import type { TeacherAssignment } from '../api/teacher-context-api';

export function getMockTeacherAssignment(
  overrides?: Partial<TeacherAssignment>,
): TeacherAssignment {
  return {
    sectionId: 'sec-1',
    sectionName: 'UKG A',
    grade: 'UKG',
    bandId: 'band-pp',
    assessmentMode: 'three_state_narrative',
    subjectId: null,
    subjectName: null,
    isClassTeacher: true,
    ...overrides,
  };
}

/** Seed the teacher-context store for component tests that load on selection. */
export function seedTeacherContext(
  overrides?: Partial<TeacherAssignment>,
): TeacherContextState {
  clearTeacherContext();
  const selected = getMockTeacherAssignment(overrides);
  const state: TeacherContextState = {
    teacherId: 'teacher-1',
    assignments: [selected],
    selected,
  };
  teacherContext.set(state);
  return state;
}
