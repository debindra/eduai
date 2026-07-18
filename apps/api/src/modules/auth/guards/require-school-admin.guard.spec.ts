import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { REQUIRE_SCHOOL_ADMIN_KEY } from '../decorators/require-school-admin.decorator';
import {
  getMockExecutionContext,
  getMockMembership,
  getMockRequestUser,
} from '../../../test-utils/factories';
import { RequireSchoolAdminGuard } from './require-school-admin.guard';

describe('RequireSchoolAdminGuard', () => {
  const reflector = new Reflector();
  let guard: RequireSchoolAdminGuard;

  beforeEach(() => {
    guard = new RequireSchoolAdminGuard(reflector);
  });

  it('allows admin whose membership matches the route schoolId param', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ schoolIdParam: 'schoolId' });
    const request = {
      params: { schoolId: 'school-1' },
      user: getMockRequestUser({
        memberships: [
          getMockMembership({
            memberType: 'admin',
            teacherId: null,
            adminId: 'admin-1',
            schoolId: 'school-1',
          }),
        ],
      }),
    };
    expect(guard.canActivate(getMockExecutionContext(request) as never)).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(REQUIRE_SCHOOL_ADMIN_KEY, [
      expect.anything(),
      expect.anything(),
    ]);
  });

  it('allows admin whose membership matches schoolId in the request body', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ schoolIdBody: 'schoolId' });
    const request = {
      body: { schoolId: 'school-1', memberType: 'teacher' },
      user: getMockRequestUser({
        memberships: [
          getMockMembership({
            memberType: 'admin',
            teacherId: null,
            adminId: 'admin-1',
            schoolId: 'school-1',
          }),
        ],
      }),
    };
    expect(guard.canActivate(getMockExecutionContext(request) as never)).toBe(true);
  });

  it('rejects admin from a different school', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ schoolIdParam: 'schoolId' });
    const request = {
      params: { schoolId: 'school-2' },
      user: getMockRequestUser({
        memberships: [
          getMockMembership({
            memberType: 'admin',
            teacherId: null,
            adminId: 'admin-1',
            schoolId: 'school-1',
          }),
        ],
      }),
    };
    expect(() => guard.canActivate(getMockExecutionContext(request) as never)).toThrow(
      ForbiddenException,
    );
  });

  it('rejects when no authenticated user is present', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ schoolIdParam: 'schoolId' });
    const request = { params: { schoolId: 'school-1' } };
    expect(() => guard.canActivate(getMockExecutionContext(request) as never)).toThrow(
      ForbiddenException,
    );
  });

  it('passes through when no school-admin metadata is set', () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(getMockExecutionContext({}) as never)).toBe(true);
  });
});
