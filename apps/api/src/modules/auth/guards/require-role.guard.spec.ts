import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequireRoleGuard } from './require-role.guard';
import { REQUIRE_ROLE_KEY } from '../decorators/require-role.decorator';
import { REQUIRE_SCHOOL_ADMIN_KEY } from '../decorators/require-school-admin.decorator';
import {
  getMockExecutionContext,
  getMockMembership,
  getMockRequestUser,
} from '../../../test-utils/factories';

describe('RequireRoleGuard', () => {
  const reflector = new Reflector();
  let guard: RequireRoleGuard;

  beforeEach(() => {
    guard = new RequireRoleGuard(reflector);
  });

  it('allows active admin when admin role is required', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const request = {
      user: getMockRequestUser({
        memberships: [
          getMockMembership({
            memberType: 'admin',
            teacherId: null,
            adminId: 'admin-1',
          }),
        ],
      }),
    };
    expect(guard.canActivate(getMockExecutionContext(request) as never)).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(REQUIRE_ROLE_KEY, [
      expect.anything(),
      expect.anything(),
    ]);
  });

  it('rejects teacher when admin role is required', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    const request = {
      user: getMockRequestUser({
        memberships: [getMockMembership({ memberType: 'teacher' })],
      }),
    };
    expect(() => guard.canActivate(getMockExecutionContext(request) as never)).toThrow(
      ForbiddenException,
    );
  });

  it('rejects when no authenticated user is present', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['admin']);
    expect(() =>
      guard.canActivate(getMockExecutionContext({}) as never),
    ).toThrow(ForbiddenException);
  });

  it('passes through when no role metadata is set', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(getMockExecutionContext({}) as never)).toBe(true);
  });

  it('rejects platform admin for admin role without RequireSchoolAdmin metadata', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === REQUIRE_ROLE_KEY) return ['admin'];
      if (key === REQUIRE_SCHOOL_ADMIN_KEY) return undefined;
      return undefined;
    });
    const request = {
      user: getMockRequestUser({
        memberships: [],
        platformAdmin: { id: 'pa-1', displayName: 'Platform' },
      }),
    };
    expect(() => guard.canActivate(getMockExecutionContext(request) as never)).toThrow(
      ForbiddenException,
    );
  });

  it('allows platform admin for admin role when RequireSchoolAdmin metadata is present', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key) => {
      if (key === REQUIRE_ROLE_KEY) return ['admin'];
      if (key === REQUIRE_SCHOOL_ADMIN_KEY) return { schoolIdQuery: 'schoolId' };
      return undefined;
    });
    const request = {
      user: getMockRequestUser({
        memberships: [],
        platformAdmin: { id: 'pa-1', displayName: 'Platform' },
      }),
    };
    expect(guard.canActivate(getMockExecutionContext(request) as never)).toBe(true);
  });
});
