import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { getMockExecutionContext } from '../../../test-utils/factories';

describe('SupabaseAuthGuard', () => {
  let guard: SupabaseAuthGuard;
  let getUserFromToken: ReturnType<typeof vi.fn>;
  let identityMaybeSingle: ReturnType<typeof vi.fn>;
  let membershipsEq: ReturnType<typeof vi.fn>;
  let profileMaybeSingle: ReturnType<typeof vi.fn>;
  let platformAdminMaybeSingle: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getUserFromToken = vi.fn();
    identityMaybeSingle = vi.fn();
    profileMaybeSingle = vi.fn();
    platformAdminMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    membershipsEq = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'membership-1',
            school_id: 'school-1',
            member_type: 'admin',
            status: 'active',
          },
        ],
        error: null,
      }),
    });

    const client = {
      from: (table: string) => {
        if (table === 'identities') {
          return {
            select: () => ({
              eq: () => ({ maybeSingle: identityMaybeSingle }),
            }),
          };
        }
        if (table === 'school_memberships') {
          return {
            select: () => ({
              eq: membershipsEq,
            }),
          };
        }
        if (table === 'platform_admins') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({ maybeSingle: platformAdminMaybeSingle }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({ maybeSingle: profileMaybeSingle }),
          }),
        };
      },
    };

    guard = new SupabaseAuthGuard(
      { getClient: () => client } as never,
      { getUserFromToken } as never,
    );
  });

  it('rejects requests without a bearer token', async () => {
    const request = { headers: {} };
    await expect(
      guard.canActivate(getMockExecutionContext(request) as never),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects invalid tokens', async () => {
    getUserFromToken.mockResolvedValue(null);
    const request = { headers: { authorization: 'Bearer bad-token' } };
    await expect(
      guard.canActivate(getMockExecutionContext(request) as never),
    ).rejects.toThrow('Invalid or expired token');
  });

  it('rejects inactive identities', async () => {
    getUserFromToken.mockResolvedValue({ id: 'auth-1' });
    identityMaybeSingle.mockResolvedValue({
      data: {
        id: 'identity-1',
        auth_user_id: 'auth-1',
        email: 'admin@schoolx.dev',
        phone: null,
        account_status: 'invited',
      },
      error: null,
    });
    const request = { headers: { authorization: 'Bearer good-token' } };
    await expect(
      guard.canActivate(getMockExecutionContext(request) as never),
    ).rejects.toThrow('Account is not active');
  });

  it('attaches RequestUser for an active identity', async () => {
    getUserFromToken.mockResolvedValue({ id: 'auth-1' });
    identityMaybeSingle.mockResolvedValue({
      data: {
        id: 'identity-1',
        auth_user_id: 'auth-1',
        email: 'admin@schoolx.dev',
        phone: null,
        account_status: 'active',
      },
      error: null,
    });
    profileMaybeSingle.mockResolvedValue({ data: { id: 'admin-1' }, error: null });

    const request: {
      headers: { authorization: string };
      user?: unknown;
    } = { headers: { authorization: 'Bearer good-token' } };

    await expect(
      guard.canActivate(getMockExecutionContext(request) as never),
    ).resolves.toBe(true);

    expect(request.user).toEqual({
      identityId: 'identity-1',
      authUserId: 'auth-1',
      accountStatus: 'active',
      email: 'admin@schoolx.dev',
      phone: null,
      memberships: [
        {
          id: 'membership-1',
          schoolId: 'school-1',
          memberType: 'admin',
          status: 'active',
          teacherId: null,
          adminId: 'admin-1',
        },
      ],
      platformAdmin: null,
    });
  });
});
