import { writable, get } from 'svelte/store';

/** Client-side session only — not a security boundary; API enforces access. */
export type MemberType = 'admin' | 'teacher' | 'super_admin';

export type SessionIdentity = {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
};

export type SessionState = {
  accessToken: string;
  identity: SessionIdentity;
  memberType: MemberType;
  /** Null for super_admin (no school membership). */
  schoolId: string | null;
} | null;

export const SESSION_STORAGE_KEY = 'eduai.session';

function isValidMemberType(value: unknown): value is MemberType {
  return value === 'admin' || value === 'teacher' || value === 'super_admin';
}

function readStoredSession(): SessionState {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionState;
    if (
      !parsed ||
      typeof parsed.accessToken !== 'string' ||
      !parsed.identity ||
      !isValidMemberType(parsed.memberType)
    ) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    if (parsed.memberType === 'super_admin') {
      return { ...parsed, schoolId: null };
    }
    if (typeof parsed.schoolId !== 'string') {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

function writeStoredSession(next: SessionState): void {
  if (typeof localStorage === 'undefined') return;
  if (next === null) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
}

export const session = writable<SessionState>(readStoredSession());

export function getSession(): SessionState {
  return get(session);
}

export function setSession(next: SessionState): void {
  writeStoredSession(next);
  session.set(next);
}

export function clearSession(): void {
  writeStoredSession(null);
  session.set(null);
}

export function getAccessToken(): string | null {
  return get(session)?.accessToken ?? null;
}
