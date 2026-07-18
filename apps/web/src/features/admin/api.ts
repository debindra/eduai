import { apiFetch } from '../../lib/shared/api/client';
import { get } from 'svelte/store';
import { session } from '../../lib/shared/stores/session';
import type { AdminDashboardShape } from './admin-logic';

export function getAdminSchoolId(): string {
  const s = get(session);
  return s?.schoolId ?? '11111111-1111-1111-1111-111111111111';
}

export async function getAdminDashboard(periodStart?: string, periodEnd?: string) {
  const params = new URLSearchParams({ schoolId: getAdminSchoolId() });
  if (periodStart) params.set('periodStart', periodStart);
  if (periodEnd) params.set('periodEnd', periodEnd);
  return apiFetch<AdminDashboardShape>(`/admin/dashboard?${params.toString()}`);
}
