import type { TeacherAssignment } from '../../lib/shared/api/teacher-context-api';

export type TeacherNavGrain = 'class_teacher' | 'subject';

export type TeacherNavLink = {
  href: string;
  label: string;
  /** When set, link is only shown for matching assignment grain. */
  grain?: TeacherNavGrain;
};

export const TEACHER_NAV_FALLBACK_HREF = '/teacher/calendar';

/** Full teacher header catalog (order preserved in the nav). */
export const TEACHER_NAV_LINKS: readonly TeacherNavLink[] = [
  { href: '/teacher/calendar', label: 'Calendar' },
  { href: '/teacher/attendance', label: 'Attendance', grain: 'class_teacher' },
  { href: '/teacher/sweep', label: 'Sweep' },
  { href: '/teacher/weekly', label: 'Weekly' },
  { href: '/teacher/lesson', label: 'Lesson' },
  { href: '/teacher/pacing', label: 'Pacing' },
  { href: '/teacher/reports', label: 'Reports', grain: 'class_teacher' },
  { href: '/teacher/subject', label: 'Subject', grain: 'subject' },
  { href: '/teacher/oversight', label: 'Oversight', grain: 'class_teacher' },
  { href: '/teacher/remedial', label: 'Remedial' },
  { href: '/teacher/messaging', label: 'Inbox' },
  { href: '/teacher/manage', label: 'Manage' },
  { href: '/teacher/certification', label: 'Certification' },
  { href: '/teacher/community', label: 'Community' },
] as const;

type AssignmentGrain = Pick<TeacherAssignment, 'isClassTeacher' | 'subjectId'>;

function isLinkVisible(
  link: TeacherNavLink,
  selected: AssignmentGrain | null,
): boolean {
  if (!link.grain) {
    return true;
  }
  if (!selected) {
    return false;
  }
  if (link.grain === 'class_teacher') {
    return selected.isClassTeacher;
  }
  return selected.subjectId != null;
}

/** Links visible for the selected assignment grain (shared only when none selected). */
export function visibleTeacherNavLinks(
  selected: AssignmentGrain | null,
): TeacherNavLink[] {
  return TEACHER_NAV_LINKS.filter((link) => isLinkVisible(link, selected));
}

export function isTeacherNavHrefVisible(
  href: string,
  selected: AssignmentGrain | null,
): boolean {
  const path = href.split('?')[0] ?? href;
  const link = TEACHER_NAV_LINKS.find((item) => item.href === path);
  if (!link) {
    return true;
  }
  return isLinkVisible(link, selected);
}

/**
 * When switching assignment, if the current path is grain-gated and no longer
 * visible, return the fallback href; otherwise null (stay put).
 */
export function teacherNavPathAfterAssignmentChange(
  currentPath: string,
  selected: AssignmentGrain | null,
): string | null {
  if (isTeacherNavHrefVisible(currentPath, selected)) {
    return null;
  }
  return TEACHER_NAV_FALLBACK_HREF;
}
