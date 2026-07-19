import { apiFetch } from '../api/client';

export type TeacherAssignment = {
  sectionId: string;
  sectionName: string;
  grade: string;
  bandId: string;
  assessmentMode: string;
  subjectId: string | null;
  subjectName: string | null;
  isClassTeacher: boolean;
};

export type TeacherContextResponse = {
  teacherId: string;
  assignments: TeacherAssignment[];
};

export async function fetchTeacherContext(): Promise<TeacherContextResponse> {
  return apiFetch<TeacherContextResponse>('/teacher/me/context');
}
