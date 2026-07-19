/** Local roster shapes — structural provisioning (names/rolls allowed). */

export type ChildStatus = 'active' | 'promoted' | 'transferred' | 'exited';

export type SectionShape = {
  id: string;
  schoolId: string;
  bandId: string | null;
  grade: string | null;
  name: string;
};

export type ChildShape = {
  id: string;
  sectionId: string;
  name: string;
  rollNumber: string | null;
  dob: string | null;
  status: ChildStatus;
  reportLanguageOverride: string | null;
  accessNote: string | null;
};

export type TeacherSectionShape = {
  id: string;
  teacherId: string;
  sectionId: string;
  subjectId: string | null;
  isClassTeacher: boolean;
};

export type TeacherRosterShape = {
  teacherId: string;
  identityId: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  accountStatus: 'invited' | 'active' | 'disabled';
};

export type BandSubjectShape = {
  id: string;
  code: string;
  nameEn: string;
  nameNp: string | null;
  sortOrder: number;
};

export type BandShape = {
  id: string;
  code: string;
  nameEn: string;
  nameNp: string | null;
  assessmentMode: string;
  aggregationRule: string | null;
  gradeRange: string | null;
  subjects: BandSubjectShape[];
};

/** Band-as-data: empty subjects → subjectId must be null. */
export function subjectRequiredForBand(band: BandShape | null | undefined): boolean {
  return (band?.subjects.length ?? 0) > 0;
}

export function validateSubjectForBand(
  band: BandShape | null | undefined,
  subjectId: string | null,
): string | null {
  if (!band) {
    return 'Select a section with a band first';
  }
  if (!subjectRequiredForBand(band)) {
    return subjectId === null ? null : 'This band has no subjects; leave subject empty';
  }
  if (subjectId === null) {
    return 'Subject is required for this band';
  }
  if (!band.subjects.some((s) => s.id === subjectId)) {
    return 'Subject is not configured for this band';
  }
  return null;
}

export function validateRollNumber(roll: string): string | null {
  const trimmed = roll.trim();
  if (!trimmed) return null;
  if (trimmed.length > 32) return 'Roll number is too long';
  return null;
}

export function groupChildrenBySection(
  children: ChildShape[],
): Map<string, ChildShape[]> {
  const map = new Map<string, ChildShape[]>();
  for (const child of children) {
    const list = map.get(child.sectionId) ?? [];
    list.push(child);
    map.set(child.sectionId, list);
  }
  return map;
}

export function groupAssignmentsBySection(
  assignments: TeacherSectionShape[],
): Map<string, TeacherSectionShape[]> {
  const map = new Map<string, TeacherSectionShape[]>();
  for (const row of assignments) {
    const list = map.get(row.sectionId) ?? [];
    list.push(row);
    map.set(row.sectionId, list);
  }
  return map;
}

export function teacherLabel(teacher: TeacherRosterShape): string {
  return (
    teacher.displayName ??
    teacher.email ??
    teacher.phone ??
    teacher.teacherId.slice(0, 8)
  );
}

export function accountStatusLabel(status: TeacherRosterShape['accountStatus']): string {
  if (status === 'invited') return 'Invited';
  if (status === 'active') return 'Active';
  return 'Disabled';
}
