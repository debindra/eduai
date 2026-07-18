import { writable, get } from 'svelte/store';

/** Client-side session only — not a security boundary; API enforces access. */
export type MemberType = 'admin' | 'teacher';

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
  schoolId: string;
} | null;

export const session = writable<SessionState>(null);

export function getSession(): SessionState {
  return get(session);
}

export function setSession(next: SessionState): void {
  session.set(next);
}

export function clearSession(): void {
  session.set(null);
}

export function getAccessToken(): string | null {
  return get(session)?.accessToken ?? null;
}
