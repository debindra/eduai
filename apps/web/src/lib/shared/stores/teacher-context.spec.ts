import { describe, expect, it } from 'vitest';
import type { TeacherAssignment } from '../api/teacher-context-api';
import {
  assignmentOptionKey,
  findAssignment,
  pickDefaultAssignment,
  resolveSelection,
} from './teacher-context';

function getMockAssignment(
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

describe('teacher-context selection logic', () => {
  it('pickDefaultAssignment prefers class-teacher row', () => {
    const assignments = [
      getMockAssignment({
        sectionId: 'sec-g1',
        sectionName: 'Grade 1 A',
        isClassTeacher: false,
        subjectId: 'math',
        subjectName: 'Math',
      }),
      getMockAssignment({ sectionId: 'sec-ukg', isClassTeacher: true }),
    ];
    expect(pickDefaultAssignment(assignments)?.sectionId).toBe('sec-ukg');
  });

  it('pickDefaultAssignment falls back to first when no class-teacher', () => {
    const assignments = [
      getMockAssignment({ isClassTeacher: false, subjectId: 'math' }),
    ];
    expect(pickDefaultAssignment(assignments)?.subjectId).toBe('math');
  });

  it('resolveSelection restores stored assignment when still present', () => {
    const assignments = [
      getMockAssignment({ sectionId: 'sec-a', isClassTeacher: true }),
      getMockAssignment({
        sectionId: 'sec-b',
        subjectId: 'math',
        isClassTeacher: false,
      }),
    ];
    const selected = resolveSelection(assignments, {
      sectionId: 'sec-b',
      subjectId: 'math',
    });
    expect(selected?.sectionId).toBe('sec-b');
    expect(selected?.subjectId).toBe('math');
  });

  it('resolveSelection falls back when stored assignment is gone', () => {
    const assignments = [
      getMockAssignment({ sectionId: 'sec-a', isClassTeacher: true }),
    ];
    const selected = resolveSelection(assignments, {
      sectionId: 'gone',
      subjectId: null,
    });
    expect(selected?.sectionId).toBe('sec-a');
  });

  it('findAssignment matches section + subject including null', () => {
    const assignments = [
      getMockAssignment({ sectionId: 'sec-a', subjectId: null }),
      getMockAssignment({ sectionId: 'sec-a', subjectId: 'math' }),
    ];
    expect(findAssignment(assignments, 'sec-a', null)?.subjectId).toBeNull();
    expect(findAssignment(assignments, 'sec-a', 'math')?.subjectId).toBe('math');
  });

  it('assignmentOptionKey distinguishes subject grains on the same section', () => {
    const classTeacher = getMockAssignment({
      sectionId: 'sec-a',
      subjectId: null,
      isClassTeacher: true,
    });
    const math = getMockAssignment({
      sectionId: 'sec-a',
      subjectId: 'math',
      isClassTeacher: false,
    });
    expect(assignmentOptionKey(classTeacher)).toBe('sec-a::null');
    expect(assignmentOptionKey(math)).toBe('sec-a::math');
    expect(assignmentOptionKey(classTeacher)).not.toBe(assignmentOptionKey(math));
  });
});
