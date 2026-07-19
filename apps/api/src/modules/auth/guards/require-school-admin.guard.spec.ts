import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { REQUIRE_SCHOOL_ADMIN_KEY } from '../decorators/require-school-admin.decorator';
import {
  getMockExecutionContext,
  getMockMembership,
  getMockRequestUser,
} from '../../../test-utils/factories';
import type { SupportSessionAccessService } from '../../platform/support-session-access.service';
import { RequireSchoolAdminGuard } from './require-school-admin.guard';

describe('RequireSchoolAdminGuard', () => {
  const reflector = new Reflector();
  let guard: RequireSchoolAdminGuard;
  let supportSessions: { authorizeAndAudit: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    supportSessions = { authorizeAndAudit: vi.fn().mockResolvedValue(false) };
    guard = new RequireSchoolAdminGuard(
      reflector,
      supportSessions as unknown as SupportSessionAccessService,
    );
  });

  it('allows admin whose membership matches the route schoolId param', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ schoolIdParam: 'schoolId' });
    const request = {
      params: { schoolId: 'school-1' },
      method: 'GET',
      path: '/calendar/school-1/status',
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
    await expect(guard.canActivate(getMockExecutionContext(request) as never)).resolves.toBe(
      true,
    );
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(REQUIRE_SCHOOL_ADMIN_KEY, [
      expect.anything(),
      expect.anything(),
    ]);
  });

  it('allows admin whose membership matches schoolId in the request body', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ schoolIdBody: 'schoolId' });
    const request = {
      body: { schoolId: 'school-1', memberType: 'teacher' },
      method: 'POST',
      path: '/auth/invite',
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
    await expect(guard.canActivate(getMockExecutionContext(request) as never)).resolves.toBe(
      true,
    );
  });

  it('rejects admin from a different school', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ schoolIdParam: 'schoolId' });
    const request = {
      params: { schoolId: 'school-2' },
      method: 'GET',
      path: '/calendar/school-2/status',
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
    await expect(guard.canActivate(getMockExecutionContext(request) as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows platform admin with an active support session', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ schoolIdParam: 'schoolId' });
    supportSessions.authorizeAndAudit.mockResolvedValue(true);
    const request = {
      params: { schoolId: 'school-1' },
      method: 'GET',
      path: '/calendar/school-1/status',
      user: getMockRequestUser({
        memberships: [],
        platformAdmin: { id: 'pa-1', displayName: 'Platform' },
      }),
    };
    await expect(guard.canActivate(getMockExecutionContext(request) as never)).resolves.toBe(
      true,
    );
    expect(supportSessions.authorizeAndAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        platformAdminId: 'pa-1',
        schoolId: 'school-1',
      }),
    );
  });

  it('rejects platform admin without an active support session', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ schoolIdParam: 'schoolId' });
    supportSessions.authorizeAndAudit.mockResolvedValue(false);
    const request = {
      params: { schoolId: 'school-1' },
      method: 'GET',
      path: '/calendar/school-1/status',
      user: getMockRequestUser({
        memberships: [],
        platformAdmin: { id: 'pa-1', displayName: 'Platform' },
      }),
    };
    await expect(guard.canActivate(getMockExecutionContext(request) as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects when no authenticated user is present', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ schoolIdParam: 'schoolId' });
    const request = { params: { schoolId: 'school-1' }, method: 'GET', path: '/' };
    await expect(guard.canActivate(getMockExecutionContext(request) as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('passes through when no school-admin metadata is set', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    await expect(guard.canActivate(getMockExecutionContext({}) as never)).resolves.toBe(true);
  });
});
