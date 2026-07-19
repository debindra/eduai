import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getMockExecutionContext,
  getMockMembership,
  getMockRequestUser,
} from '../../../test-utils/factories';
import type { SupportSessionAccessService } from '../support-session-access.service';
import { PlatformSupportSessionGuard } from './platform-support-session.guard';

describe('PlatformSupportSessionGuard', () => {
  const reflector = new Reflector();
  let guard: PlatformSupportSessionGuard;
  let supportSessions: { authorizeAndAudit: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    supportSessions = { authorizeAndAudit: vi.fn().mockResolvedValue(false) };
    guard = new PlatformSupportSessionGuard(
      reflector,
      supportSessions as unknown as SupportSessionAccessService,
    );
  });

  it('passes through for non-platform users', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ schoolIdParam: 'schoolId' });
    const request = {
      params: { schoolId: 'school-1' },
      method: 'GET',
      path: '/admin/dashboard',
      user: getMockRequestUser({
        memberships: [getMockMembership({ memberType: 'admin', adminId: 'a1', teacherId: null })],
      }),
    };
    await expect(guard.canActivate(getMockExecutionContext(request) as never)).resolves.toBe(
      true,
    );
    expect(supportSessions.authorizeAndAudit).not.toHaveBeenCalled();
  });

  it('allows platform admin with active support session (audited)', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ schoolIdQuery: 'schoolId' });
    supportSessions.authorizeAndAudit.mockResolvedValue(true);
    const request = {
      query: { schoolId: 'school-1' },
      method: 'GET',
      path: '/admin/dashboard',
      user: getMockRequestUser({
        memberships: [],
        platformAdmin: { id: 'pa-1', displayName: 'Platform' },
      }),
    };
    await expect(guard.canActivate(getMockExecutionContext(request) as never)).resolves.toBe(
      true,
    );
  });

  it('denies platform admin without active support session', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ schoolIdQuery: 'schoolId' });
    supportSessions.authorizeAndAudit.mockResolvedValue(false);
    const request = {
      query: { schoolId: 'school-1' },
      method: 'GET',
      path: '/admin/dashboard',
      user: getMockRequestUser({
        memberships: [],
        platformAdmin: { id: 'pa-1', displayName: 'Platform' },
      }),
    };
    await expect(guard.canActivate(getMockExecutionContext(request) as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
