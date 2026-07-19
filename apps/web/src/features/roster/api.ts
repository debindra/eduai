import { apiFetch } from '../../lib/shared/api/client';
import { getSession } from '../../lib/shared/stores/session';
import type { components } from '../../lib/shared/api/generated-types';
import type {
  BandShape,
  ChildShape,
  ChildStatus,
  SectionShape,
  TeacherRosterShape,
  TeacherSectionShape,
} from './roster-logic';

type InviteRequest = components['schemas']['InviteDto'];
type InviteResponse = components['schemas']['InviteResponseDto'];

function requireSchoolId(): string {
  const schoolId = getSession()?.schoolId;
  if (!schoolId) {
    throw new Error('Not signed in — school context missing');
  }
  return schoolId;
}

function schoolPath(suffix: string): string {
  return `/schools/${requireSchoolId()}${suffix}`;
}

export async function listSections(): Promise<SectionShape[]> {
  return apiFetch<SectionShape[]>(schoolPath('/sections'));
}

export async function createSection(payload: {
  name: string;
  bandId: string;
  grade?: string;
}): Promise<SectionShape> {
  return apiFetch<SectionShape>(schoolPath('/sections'), {
    method: 'POST',
    body: payload,
  });
}

export async function updateSection(
  sectionId: string,
  payload: { name?: string; bandId?: string; grade?: string },
): Promise<SectionShape> {
  return apiFetch<SectionShape>(schoolPath(`/sections/${sectionId}`), {
    method: 'PATCH',
    body: payload,
  });
}

export async function deleteSection(sectionId: string): Promise<{ deleted: true; sectionId: string }> {
  return apiFetch(schoolPath(`/sections/${sectionId}`), { method: 'DELETE' });
}

export async function listChildren(sectionId?: string): Promise<ChildShape[]> {
  const qs = sectionId ? `?sectionId=${encodeURIComponent(sectionId)}` : '';
  return apiFetch<ChildShape[]>(schoolPath(`/children${qs}`));
}

export async function createChild(payload: {
  sectionId: string;
  name: string;
  rollNumber?: string;
  dob?: string;
}): Promise<ChildShape> {
  return apiFetch<ChildShape>(schoolPath('/children'), {
    method: 'POST',
    body: payload,
  });
}

export async function updateChild(
  childId: string,
  payload: {
    name?: string;
    sectionId?: string;
    rollNumber?: string;
    dob?: string;
  },
): Promise<ChildShape> {
  return apiFetch<ChildShape>(schoolPath(`/children/${childId}`), {
    method: 'PATCH',
    body: payload,
  });
}

export async function updateChildStatus(
  childId: string,
  status: ChildStatus,
): Promise<ChildShape> {
  return apiFetch<ChildShape>(schoolPath(`/children/${childId}/status`), {
    method: 'PATCH',
    body: { status },
  });
}

export async function listTeacherSections(
  sectionId?: string,
): Promise<TeacherSectionShape[]> {
  const qs = sectionId ? `?sectionId=${encodeURIComponent(sectionId)}` : '';
  return apiFetch<TeacherSectionShape[]>(schoolPath(`/teacher-sections${qs}`));
}

export async function createTeacherSection(payload: {
  teacherId: string;
  sectionId: string;
  subjectId?: string | null;
  isClassTeacher?: boolean;
}): Promise<TeacherSectionShape> {
  return apiFetch<TeacherSectionShape>(schoolPath('/teacher-sections'), {
    method: 'POST',
    body: payload,
  });
}

export async function updateTeacherSection(
  assignmentId: string,
  payload: { isClassTeacher?: boolean },
): Promise<TeacherSectionShape> {
  return apiFetch<TeacherSectionShape>(
    schoolPath(`/teacher-sections/${assignmentId}`),
    { method: 'PATCH', body: payload },
  );
}

export async function deleteTeacherSection(
  assignmentId: string,
): Promise<{ deleted: true; assignmentId: string }> {
  return apiFetch(schoolPath(`/teacher-sections/${assignmentId}`), {
    method: 'DELETE',
  });
}

export async function listTeachers(): Promise<TeacherRosterShape[]> {
  return apiFetch<TeacherRosterShape[]>(schoolPath('/teachers'));
}

/** Band config with subjects — used for assignment subject dropdown (band-as-data). */
export async function listBands(): Promise<BandShape[]> {
  const response = await apiFetch<{ bands: BandShape[] }>('/bands');
  return response.bands ?? [];
}

export async function inviteTeacher(payload: {
  email?: string;
  phone?: string;
  displayName?: string;
  memberType?: 'teacher' | 'admin';
}): Promise<InviteResponse> {
  const body: InviteRequest = {
    schoolId: requireSchoolId(),
    memberType: payload.memberType ?? 'teacher',
    email: payload.email,
    phone: payload.phone,
    displayName: payload.displayName,
  };
  return apiFetch<InviteResponse>('/auth/invite', {
    method: 'POST',
    body,
  });
}
