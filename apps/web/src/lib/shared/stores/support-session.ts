import { writable, get } from 'svelte/store';

/** Active platform support-session school context — UX only; API enforces. */
export type SupportSessionState = {
  sessionId: string;
  schoolId: string;
  schoolName: string | null;
  expiresAt: string;
} | null;

export const SUPPORT_SESSION_STORAGE_KEY = 'eduai.supportSession';

function readStored(): SupportSessionState {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SUPPORT_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SupportSessionState;
    if (
      !parsed ||
      typeof parsed.sessionId !== 'string' ||
      typeof parsed.schoolId !== 'string' ||
      typeof parsed.expiresAt !== 'string'
    ) {
      localStorage.removeItem(SUPPORT_SESSION_STORAGE_KEY);
      return null;
    }
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(SUPPORT_SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(SUPPORT_SESSION_STORAGE_KEY);
    return null;
  }
}

export const supportSession = writable<SupportSessionState>(readStored());

export function getSupportSession(): SupportSessionState {
  return get(supportSession);
}

export function setSupportSession(next: SupportSessionState): void {
  if (typeof localStorage !== 'undefined') {
    if (next === null) {
      localStorage.removeItem(SUPPORT_SESSION_STORAGE_KEY);
    } else {
      localStorage.setItem(SUPPORT_SESSION_STORAGE_KEY, JSON.stringify(next));
    }
  }
  supportSession.set(next);
}

export function clearSupportSession(): void {
  setSupportSession(null);
}
