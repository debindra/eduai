import type { RequestMembership, RequestUser } from '../modules/auth/types/request-user.types';

export function getMockMembership(
  overrides?: Partial<RequestMembership>,
): RequestMembership {
  return {
    id: 'membership-1',
    schoolId: 'school-1',
    memberType: 'teacher',
    status: 'active',
    teacherId: 'teacher-1',
    adminId: null,
    ...overrides,
  };
}

export function getMockRequestUser(overrides?: Partial<RequestUser>): RequestUser {
  return {
    identityId: 'identity-1',
    authUserId: 'auth-1',
    accountStatus: 'active',
    email: 'teacher@schoolx.dev',
    phone: null,
    memberships: [getMockMembership()],
    platformAdmin: null,
    ...overrides,
  };
}

export function getMockExecutionContext(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  };
}
