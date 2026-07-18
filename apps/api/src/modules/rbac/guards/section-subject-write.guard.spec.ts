import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionSubjectWriteGuard } from './section-subject-write.guard';
import { SECTION_SUBJECT_SCOPE_KEY } from '../decorators/require-section-subject-scope.decorator';
import type { RequestUser } from '../../auth/types/request-user.types';

describe('SectionSubjectWriteGuard', () => {
  const reflector = new Reflector();
  let guard: SectionSubjectWriteGuard;
  let maybeSingle: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    maybeSingle = vi.fn();
    const supabase = {
      getClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({ maybeSingle }),
                is: () => ({ maybeSingle }),
              }),
              is: () => ({ maybeSingle }),
            }),
          }),
        }),
      }),
    };
    guard = new SectionSubjectWriteGuard(reflector, supabase as never);
  });

  it('rejects write when teacher lacks the requested subject grain', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      sectionIdParam: 'sectionId',
      subjectIdParam: 'subjectId',
    });
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const request = {
      user: {
        identityId: 'identity-1',
        authUserId: 'auth-1',
        accountStatus: 'active',
        email: null,
        phone: null,
        memberships: [
          {
            id: 'membership-1',
            schoolId: 'school-1',
            memberType: 'teacher',
            status: 'active',
            teacherId: 'teacher-1',
            adminId: null,
          },
        ],
      } satisfies RequestUser,
      params: {
        sectionId: 'section-1',
        subjectId: 'subject-wrong',
      },
      body: {},
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };
    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(ForbiddenException);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(SECTION_SUBJECT_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  });

  it('allows pre-primary write when subject_id is null on teacher_sections', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      sectionIdParam: 'sectionId',
      subjectIdBody: 'subjectId',
    });
    maybeSingle.mockResolvedValue({ data: { id: 'ts-1' }, error: null });
    const request = {
      user: {
        identityId: 'identity-1',
        authUserId: 'auth-1',
        accountStatus: 'active',
        email: null,
        phone: null,
        memberships: [
          {
            id: 'membership-1',
            schoolId: 'school-1',
            memberType: 'teacher',
            status: 'active',
            teacherId: 'teacher-1',
            adminId: null,
          },
        ],
      } satisfies RequestUser,
      params: { sectionId: 'section-1' },
      body: { subjectId: null },
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };
    await expect(guard.canActivate(context as never)).resolves.toBe(true);
  });
});
