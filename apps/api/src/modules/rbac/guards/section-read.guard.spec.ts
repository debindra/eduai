import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionReadGuard } from './section-read.guard';
import { SECTION_SUBJECT_SCOPE_KEY } from '../decorators/require-section-subject-scope.decorator';
import {
  getMockExecutionContext,
  getMockMembership,
  getMockRequestUser,
} from '../../../test-utils/factories';

describe('SectionReadGuard', () => {
  const reflector = new Reflector();
  let guard: SectionReadGuard;
  let limit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    limit = vi.fn();
    const supabase = {
      getClient: () => ({
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({ limit }),
            }),
          }),
        }),
      }),
    };
    guard = new SectionReadGuard(reflector, supabase as never);
  });

  it('allows read when teacher_sections has a row for the section', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      sectionIdParam: 'sectionId',
    });
    limit.mockResolvedValue({ data: [{ id: 'ts-1' }], error: null });
    const request = {
      user: getMockRequestUser({
        memberships: [getMockMembership({ teacherId: 'teacher-1' })],
      }),
      params: { sectionId: 'section-1' },
      body: {},
    };
    await expect(
      guard.canActivate(getMockExecutionContext(request) as never),
    ).resolves.toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(SECTION_SUBJECT_SCOPE_KEY, [
      expect.anything(),
      expect.anything(),
    ]);
  });

  it('allows read when teacher has multiple grains on the same section', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      sectionIdParam: 'sectionId',
    });
    limit.mockResolvedValue({
      data: [{ id: 'ts-class' }, { id: 'ts-math' }],
      error: null,
    });
    const request = {
      user: getMockRequestUser({
        memberships: [getMockMembership({ teacherId: 'teacher-1' })],
      }),
      params: { sectionId: 'section-1' },
      body: {},
    };
    await expect(
      guard.canActivate(getMockExecutionContext(request) as never),
    ).resolves.toBe(true);
  });

  it('rejects when teacher has no assignment for the section', async () => {
    vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      sectionIdParam: 'sectionId',
    });
    limit.mockResolvedValue({ data: [], error: null });
    const request = {
      user: getMockRequestUser(),
      params: { sectionId: 'section-other' },
      body: {},
    };
    await expect(
      guard.canActivate(getMockExecutionContext(request) as never),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
