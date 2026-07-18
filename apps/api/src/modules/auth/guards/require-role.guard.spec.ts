import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RequireRoleGuard } from './require-role.guard';
import { REQUIRE_ROLE_KEY } from '../decorators/require-role.decorator';
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
});
