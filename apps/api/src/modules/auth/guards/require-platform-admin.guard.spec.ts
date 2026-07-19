import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getMockExecutionContext,
  getMockRequestUser,
} from '../../../test-utils/factories';
import { RequirePlatformAdminGuard } from './require-platform-admin.guard';

describe('RequirePlatformAdminGuard', () => {
  const reflector = new Reflector();
  let guard: RequirePlatformAdminGuard;

  beforeEach(() => {
    guard = new RequirePlatformAdminGuard(reflector);
  });

  it('allows an active platform admin', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const request = {
      user: getMockRequestUser({
        memberships: [],
        platformAdmin: { id: 'pa-1', displayName: 'Platform' },
      }),
    };
    expect(guard.canActivate(getMockExecutionContext(request) as never)).toBe(true);
  });

  it('rejects non-platform callers', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const request = { user: getMockRequestUser({ platformAdmin: null }) };
    expect(() => guard.canActivate(getMockExecutionContext(request) as never)).toThrow(
      ForbiddenException,
    );
  });

  it('passes through when decorator is not set', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(getMockExecutionContext({}) as never)).toBe(true);
  });
});
