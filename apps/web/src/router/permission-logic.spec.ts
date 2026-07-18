import { describe, expect, it } from 'vitest';
import type { SessionState } from '../lib/shared/stores/session';
import {
  checkPermissions,
  routePermissions,
  sessionToRouterUser,
} from './permission-logic';

function getMockSession(
  overrides?: Partial<NonNullable<SessionState>>,
): NonNullable<SessionState> {
  return {
    accessToken: 'token-1',
    identity: {
      id: 'identity-1',
      email: 'admin@schoolx.dev',
      phone: null,
      displayName: 'Admin',
    },
    memberType: 'admin',
    schoolId: 'school-1',
    ...overrides,
  };
}

describe('sessionToRouterUser', () => {
  it('returns null for an empty session', () => {
    expect(sessionToRouterUser(null)).toBeNull();
  });

  it('maps admin to admin+teacher permissions', () => {
    expect(sessionToRouterUser(getMockSession({ memberType: 'admin' }))).toEqual({
      memberType: 'admin',
      schoolId: 'school-1',
      permissions: ['admin', 'teacher'],
    });
  });

  it('maps teacher to teacher permission only', () => {
    expect(
      sessionToRouterUser(getMockSession({ memberType: 'teacher' })),
    ).toEqual({
      memberType: 'teacher',
      schoolId: 'school-1',
      permissions: ['teacher'],
    });
  });
});

describe('checkPermissions', () => {
  const adminUser = sessionToRouterUser(getMockSession({ memberType: 'admin' }));
  const teacherUser = sessionToRouterUser(
    getMockSession({ memberType: 'teacher' }),
  );

  it('denies when user or requirements are missing', () => {
    expect(checkPermissions(null, routePermissions.admin)).toBe(false);
    expect(checkPermissions(adminUser, undefined)).toBe(false);
  });

  it('allows admin route for admin, denies for teacher', () => {
    expect(checkPermissions(adminUser, routePermissions.admin)).toBe(true);
    expect(checkPermissions(teacherUser, routePermissions.admin)).toBe(false);
  });

  it('allows teacher route for both admin and teacher', () => {
    expect(checkPermissions(adminUser, routePermissions.teacher)).toBe(true);
    expect(checkPermissions(teacherUser, routePermissions.teacher)).toBe(true);
  });

  it('requires all listed permissions when using all', () => {
    expect(
      checkPermissions(teacherUser, { all: ['teacher', 'admin'] }),
    ).toBe(false);
    expect(checkPermissions(adminUser, { all: ['teacher', 'admin'] })).toBe(
      true,
    );
  });
});
