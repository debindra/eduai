import { apiFetch } from '../../lib/shared/api/client';
import { requireResolvedSchoolId } from '../../lib/shared/stores/school-scope';
import type { AdminDashboardShape } from './admin-logic';

export function getAdminSchoolId(): string {
  return requireResolvedSchoolId();
}

export async function getAdminDashboard(periodStart?: string, periodEnd?: string) {
  const params = new URLSearchParams({ schoolId: getAdminSchoolId() });
  if (periodStart) params.set('periodStart', periodStart);
  if (periodEnd) params.set('periodEnd', periodEnd);
  return apiFetch<AdminDashboardShape>(`/admin/dashboard?${params.toString()}`);
}
