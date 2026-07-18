import { beforeEach, describe, expect, it } from 'vitest';
import {
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
    clearSession();
  });

  it('starts empty', () => {
    expect(getSession()).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it('setSession stores identity and access token', () => {
    const next = getMockSession();
    setSession(next);
    expect(getSession()).toEqual(next);
    expect(getAccessToken()).toBe('token-1');
  });

  it('clearSession removes the session', () => {
    setSession(getMockSession());
    clearSession();
    expect(getSession()).toBeNull();
    expect(getAccessToken()).toBeNull();
  });
});
