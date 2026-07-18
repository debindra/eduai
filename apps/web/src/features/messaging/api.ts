import { apiFetch } from '../../lib/shared/api/client';
import { get } from 'svelte/store';
import { session } from '../../lib/shared/stores/session';
import type { MessageRow } from './messaging-logic';

function schoolId(): string {
  return get(session)?.schoolId ?? '11111111-1111-1111-1111-111111111111';
}

export async function listTeacherDrafts() {
  return apiFetch<MessageRow[]>(`/messaging/teacher/drafts?schoolId=${schoolId()}`);
}

export async function listAdminQueue() {
  return apiFetch<MessageRow[]>(`/messaging/admin/queue?schoolId=${schoolId()}`);
}

export async function approveDraft(id: string) {
  return apiFetch<MessageRow>(`/messaging/${id}/approve-draft`, { method: 'POST' });
}
