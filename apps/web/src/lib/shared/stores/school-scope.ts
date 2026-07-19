import { getSession } from './session';
import { getSupportSession } from './support-session';

/**
 * School scope for admin API clients: session schoolId, or active support-session
 * school for platform super admins. UX only — API enforces access.
 */
export function resolveSchoolId(): string | null {
  const session = getSession();
  if (session?.schoolId) {
    return session.schoolId;
  }
  const support = getSupportSession();
  return support?.schoolId ?? null;
}

export function requireResolvedSchoolId(): string {
  const schoolId = resolveSchoolId();
  if (!schoolId) {
    throw new Error('Not signed in — school context missing');
  }
  return schoolId;
}
