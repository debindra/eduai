import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubstituteRoleGuard } from './substitute-role.guard';
import {
  SECTION_SUBJECT_SCOPE_KEY,
  SUBSTITUTE_BLOCKS_CONFIRMATION_KEY,
} from '../decorators/require-section-subject-scope.decorator';
import type { RequestUser } from '../../auth/types/request-user.types';

describe('SubstituteRoleGuard', () => {
  const reflector = new Reflector();
  let guard: SubstituteRoleGuard;
  let maybeSingle: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    maybeSingle = vi.fn();
    const supabase = {
      getClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                lte: () => ({
                  gte: () => ({ maybeSingle }),
                }),
              }),
            }),
          }),
        }),
      }),
    };
    guard = new SubstituteRoleGuard(reflector, supabase as never);
  });

  it('blocks confirmation when substitute access is active for the section', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockImplementation((key: unknown) => {
      if (key === SUBSTITUTE_BLOCKS_CONFIRMATION_KEY) {
        return true;
      }
      if (key === SECTION_SUBJECT_SCOPE_KEY) {
        return { sectionIdParam: 'sectionId' };
      }
      return undefined;
    });
    maybeSingle.mockResolvedValue({ data: { id: 'substitute-1' }, error: null });
    const request = {
      user: {
        identityId: 'identity-1',
        authUserId: 'auth-1',
        accountStatus: 'active',
        email: null,
        phone: null,
        memberships: [],
      } satisfies RequestUser,
      params: { sectionId: 'section-1' },
      body: {},
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };
    await expect(guard.canActivate(context as never)).rejects.toThrow(
      'Substitute teachers cannot confirm outcomes',
    );
    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
