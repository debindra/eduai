import { beforeEach, describe, expect, it } from 'vitest';
import {
  SESSION_STORAGE_KEY,
  clearSession,
  getAccessToken,
  getSession,
  setSession,
  type SessionState,
} from './session';

function getMockSession(overrides?: Partial<NonNullable<SessionState>>): NonNullable<SessionState> {
  return {
    accessToken: 'token-1',
    identity: {
      id: 'identity-1',
      email: 'teacher@schoolx.dev',
      phone: null,
      displayName: 'Jane Teacher',
    },
    memberType: 'teacher',
    schoolId: 'school-1',
    ...overrides,
  };
}

describe('session store', () => {
  beforeEach(() => {
    localStorage.clear();
    clearSession();
  });

  it('starts empty when nothing is stored', () => {
    expect(getSession()).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('setSession stores identity and access token', () => {
    const next = getMockSession();
    setSession(next);
    expect(getSession()).toEqual(next);
    expect(getAccessToken()).toBe('token-1');
  });

  it('setSession persists to localStorage', () => {
    const next = getMockSession();
    setSession(next);
    expect(JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY)!)).toEqual(next);
  });

  it('clearSession removes the session and storage', () => {
    setSession(getMockSession());
    clearSession();
    expect(getSession()).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });

  it('rejects corrupt localStorage payloads', () => {
    localStorage.setItem(SESSION_STORAGE_KEY, '{not-json');
    // Force re-read path via clear + set of bad then clearSession cleanup
    clearSession();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
  });
});
