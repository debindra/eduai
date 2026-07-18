import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RequestUser } from '../../auth/types/request-user.types';
import { SECTION_SUBJECT_SCOPE_KEY } from '../decorators/require-section-subject-scope.decorator';
import { SectionSubjectWriteGuard } from './section-subject-write.guard';

/**
 * P3-API-RBAC-01 / P3-TEST-02: prove two-grain RLS/guards collapse to
 * pre-primary (subject_id NULL) with zero guard code changes, and reject
 * cross-domain (wrong subject) writes.
 */
describe('two-grain collapse (P3-API-RBAC-01)', () => {
  const reflector = new Reflector();
  let guard: SectionSubjectWriteGuard;
  let maybeSingle: ReturnType<typeof vi.fn>;
  let lastSubjectFilter: { type: 'eq' | 'is'; value: unknown } | null;

  const teacherUser: RequestUser = {
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
        teacherId: 'teacher-math',
        adminId: null,
      },
    ],
  };

  beforeEach(() => {
    maybeSingle = vi.fn();
    lastSubjectFilter = null;
    const chain = {
      eq: vi.fn((_col: string, val: unknown) => {
        if (_col === 'subject_id') {
          lastSubjectFilter = { type: 'eq', value: val };
        }
        return chain;
      }),
      is: vi.fn((_col: string, val: unknown) => {
        if (_col === 'subject_id') {
          lastSubjectFilter = { type: 'is', value: val };
        }
        return chain;
      }),
      maybeSingle: (...args: unknown[]) => maybeSingle(...args),
    };
    const supabase = {
      getClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => chain,
            }),
          }),
        }),
      }),
    };
    guard = new SectionSubjectWriteGuard(reflector, supabase as never);
  });

  function ctx(params: Record<string, string>, body: Record<string, unknown> = {}) {
    const request = { user: teacherUser, params, body };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };
  }

  it('allows Grade 1–3 write when teacher_sections.subject_id matches', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      sectionIdParam: 'sectionId',
      subjectIdParam: 'subjectId',
    });
    maybeSingle.mockResolvedValue({ data: { id: 'ts-math' }, error: null });
    await expect(
      guard.canActivate(
        ctx({
          sectionId: '66666666-6666-6666-6666-666666666667',
          subjectId: 'd1111111-1111-1111-1111-111111111113',
        }) as never,
      ),
    ).resolves.toBe(true);
    expect(lastSubjectFilter).toEqual({
      type: 'eq',
      value: 'd1111111-1111-1111-1111-111111111113',
    });
  });

  it('allows pre-primary write when subject_id is null (same guard, zero code change)', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      sectionIdParam: 'sectionId',
      subjectIdBody: 'subjectId',
    });
    maybeSingle.mockResolvedValue({ data: { id: 'ts-pp' }, error: null });
    await expect(
      guard.canActivate(
        ctx(
          { sectionId: '66666666-6666-6666-6666-666666666666' },
          { subjectId: null },
        ) as never,
      ),
    ).resolves.toBe(true);
    expect(lastSubjectFilter).toEqual({ type: 'is', value: null });
  });

  it('rejects cross-domain contamination (math teacher cannot write english)', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      sectionIdParam: 'sectionId',
      subjectIdParam: 'subjectId',
    });
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(
      guard.canActivate(
        ctx({
          sectionId: '66666666-6666-6666-6666-666666666667',
          subjectId: 'd1111111-1111-1111-1111-111111111112', // english — not math
        }) as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(SECTION_SUBJECT_SCOPE_KEY, [
      expect.anything(),
      expect.anything(),
    ]);
  });

  // P4-API-02: same guard, basic_upper few-periods-per-week subject teacher.
  // Grade 4 section id is fixture-only; guard never branches on band/grade.
  const GRADE4_SECTION_ID = '66666666-6666-6666-6666-666666666668';
  const HEALTH_PE_SUBJECT_ID = 'd1111111-1111-1111-1111-111111111116';
  const LOCAL_SUBJECT_ID = 'd1111111-1111-1111-1111-111111111117';

  it('allows basic_upper write when teacher_sections.subject_id matches (zero guard code change)', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      sectionIdParam: 'sectionId',
      subjectIdParam: 'subjectId',
    });
    maybeSingle.mockResolvedValue({ data: { id: 'ts-hpe' }, error: null });
    await expect(
      guard.canActivate(
        ctx({
          sectionId: GRADE4_SECTION_ID,
          subjectId: HEALTH_PE_SUBJECT_ID,
        }) as never,
      ),
    ).resolves.toBe(true);
    expect(lastSubjectFilter).toEqual({
      type: 'eq',
      value: HEALTH_PE_SUBJECT_ID,
    });
  });

  it('rejects basic_upper cross-domain (health_pe teacher cannot write local_subject)', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      sectionIdParam: 'sectionId',
      subjectIdParam: 'subjectId',
    });
    maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(
      guard.canActivate(
        ctx({
          sectionId: GRADE4_SECTION_ID,
          subjectId: LOCAL_SUBJECT_ID,
        }) as never,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
