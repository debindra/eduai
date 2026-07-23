import { describe, expect, it } from 'vitest';
import type { TeacherAssignment } from '../../lib/shared/api/teacher-context-api';
import {
  TEACHER_NAV_FALLBACK_HREF,
  isTeacherNavHrefVisible,
  teacherNavPathAfterAssignmentChange,
  visibleTeacherNavLinks,
} from './teacher-nav-links';

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

function labels(selected: TeacherAssignment | null): string[] {
  return visibleTeacherNavLinks(selected).map((link) => link.label);
}

describe('visibleTeacherNavLinks', () => {
  it('shows shared links only when no assignment is selected', () => {
    const next = labels(null);
    expect(next).toContain('Calendar');
    expect(next).toContain('Sweep');
    expect(next).not.toContain('Attendance');
    expect(next).not.toContain('Reports');
    expect(next).not.toContain('Oversight');
    expect(next).not.toContain('Subject');
  });

  it('shows class-teacher links and hides Subject for class-only grain', () => {
    const next = labels(getMockAssignment({ isClassTeacher: true, subjectId: null }));
    expect(next).toContain('Attendance');
    expect(next).toContain('Reports');
    expect(next).toContain('Oversight');
    expect(next).not.toContain('Subject');
  });

  it('shows Subject and hides class-teacher links for subject grain', () => {
    const next = labels(
      getMockAssignment({
        isClassTeacher: false,
        subjectId: 'math',
        subjectName: 'Mathematics',
      }),
    );
    expect(next).toContain('Subject');
    expect(next).not.toContain('Attendance');
    expect(next).not.toContain('Reports');
    expect(next).not.toContain('Oversight');
  });

  it('shows both Oversight and Subject when class teacher has a subject', () => {
    const next = labels(
      getMockAssignment({
        isClassTeacher: true,
        subjectId: 'math',
        subjectName: 'Mathematics',
      }),
    );
    expect(next).toContain('Oversight');
    expect(next).toContain('Subject');
    expect(next).toContain('Attendance');
  });
});

describe('isTeacherNavHrefVisible', () => {
  it('allows shared hrefs for any selection', () => {
    expect(isTeacherNavHrefVisible('/teacher/calendar', null)).toBe(true);
    expect(
      isTeacherNavHrefVisible(
        '/teacher/sweep',
        getMockAssignment({ isClassTeacher: false, subjectId: 'math' }),
      ),
    ).toBe(true);
  });

  it('gates Oversight to class-teacher grain', () => {
    expect(
      isTeacherNavHrefVisible(
        '/teacher/oversight',
        getMockAssignment({ isClassTeacher: true, subjectId: null }),
      ),
    ).toBe(true);
    expect(
      isTeacherNavHrefVisible(
        '/teacher/oversight',
        getMockAssignment({ isClassTeacher: false, subjectId: 'math' }),
      ),
    ).toBe(false);
  });
});

describe('teacherNavPathAfterAssignmentChange', () => {
  it('returns null when current path remains visible', () => {
    expect(
      teacherNavPathAfterAssignmentChange(
        '/teacher/calendar',
        getMockAssignment({ isClassTeacher: false, subjectId: 'math' }),
      ),
    ).toBeNull();
  });

  it('returns calendar fallback when grain-gated path is no longer visible', () => {
    expect(
      teacherNavPathAfterAssignmentChange(
        '/teacher/oversight',
        getMockAssignment({ isClassTeacher: false, subjectId: 'math' }),
      ),
    ).toBe(TEACHER_NAV_FALLBACK_HREF);
  });
});
