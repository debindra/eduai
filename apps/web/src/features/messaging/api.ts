import { apiFetch } from '../../lib/shared/api/client';
import { requireResolvedSchoolId } from '../../lib/shared/stores/school-scope';
import type { MessageRow } from './messaging-logic';

export async function listTeacherDrafts() {
  const schoolId = requireResolvedSchoolId();
  return apiFetch<MessageRow[]>(`/messaging/teacher/drafts?schoolId=${schoolId}`);
}

export async function listAdminQueue() {
  const schoolId = requireResolvedSchoolId();
  return apiFetch<MessageRow[]>(`/messaging/admin/queue?schoolId=${schoolId}`);
}

export async function approveDraft(id: string) {
  return apiFetch<MessageRow>(`/messaging/${id}/approve-draft`, { method: 'POST' });
}
