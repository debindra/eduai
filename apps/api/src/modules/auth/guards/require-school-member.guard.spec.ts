import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMockExecutionContext, getMockRequestUser } from '../../../test-utils/factories';
import { RequireSchoolMemberGuard } from './require-school-member.guard';

describe('RequireSchoolMemberGuard', () => {
  let reflector: Reflector;
  let authorizeAndAudit: ReturnType<typeof vi.fn>;
  let guard: RequireSchoolMemberGuard;

  beforeEach(() => {
    reflector = new Reflector();
    authorizeAndAudit = vi.fn();
    guard = new RequireSchoolMemberGuard(reflector, {
      authorizeAndAudit,
    } as never);
  });

  it('passes through when metadata is absent', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    await expect(guard.canActivate(getMockExecutionContext({}) as never)).resolves.toBe(true);
  });

  it('allows teacher membership for the school', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ schoolIdParam: 'schoolId' });
    const request = {
      params: { schoolId: 'school-1' },
      method: 'GET',
      path: '/calendar/school-1/view',
      user: getMockRequestUser({
        memberships: [
          {
            id: 'm1',
            schoolId: 'school-1',
            memberType: 'teacher',
            status: 'active',
            teacherId: 't1',
            adminId: null,
          },
        ],
      }),
    };
    await expect(guard.canActivate(getMockExecutionContext(request) as never)).resolves.toBe(
      true,
    );
    expect(authorizeAndAudit).not.toHaveBeenCalled();
  });

  it('allows admin membership for the school', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ schoolIdParam: 'schoolId' });
    const request = {
      params: { schoolId: 'school-1' },
      method: 'GET',
      path: '/calendar/school-1/view',
      user: getMockRequestUser({
        memberships: [
          {
            id: 'm1',
            schoolId: 'school-1',
            memberType: 'admin',
            status: 'active',
            teacherId: null,
            adminId: 'a1',
          },
        ],
      }),
    };
    await expect(guard.canActivate(getMockExecutionContext(request) as never)).resolves.toBe(
      true,
    );
  });

  it('allows platform admin with active support session', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ schoolIdParam: 'schoolId' });
    authorizeAndAudit.mockResolvedValue(true);
    const request = {
      params: { schoolId: 'school-1' },
      method: 'GET',
      path: '/calendar/school-1/view',
      user: getMockRequestUser({
        memberships: [],
        platformAdmin: { id: 'pa-1', displayName: 'Platform' },
      }),
    };
    await expect(guard.canActivate(getMockExecutionContext(request) as never)).resolves.toBe(
      true,
    );
    expect(authorizeAndAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        platformAdminId: 'pa-1',
        schoolId: 'school-1',
      }),
    );
  });

  it('denies teacher for a different school', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ schoolIdParam: 'schoolId' });
    const request = {
      params: { schoolId: 'school-2' },
      method: 'GET',
      path: '/calendar/school-2/view',
      user: getMockRequestUser({
        memberships: [
          {
            id: 'm1',
            schoolId: 'school-1',
            memberType: 'teacher',
            status: 'active',
            teacherId: 't1',
            adminId: null,
          },
        ],
      }),
    };
    await expect(guard.canActivate(getMockExecutionContext(request) as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
