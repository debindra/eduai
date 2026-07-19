import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request } from 'express';
import { TeacherContextController } from './teacher-context.controller';
import type { TeacherContextService } from './teacher-context.service';

describe('TeacherContextController', () => {
  let controller: TeacherContextController;
  let getContext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getContext = vi.fn().mockResolvedValue({
      teacherId: 'teacher-1',
      assignments: [],
    });
    controller = new TeacherContextController({
      getContext,
    } as unknown as TeacherContextService);
  });

  it('returns context for a teacher membership', async () => {
    const req = {
      user: {
        memberships: [{ teacherId: 'teacher-1', memberType: 'teacher', status: 'active' }],
      },
    } as unknown as Request;

    await expect(controller.me(req)).resolves.toEqual({
      teacherId: 'teacher-1',
      assignments: [],
    });
    expect(getContext).toHaveBeenCalledWith('teacher-1');
  });

  it('denies non-teacher accounts with no teacher profile', async () => {
    const req = {
      user: {
        memberships: [{ teacherId: null, memberType: 'admin', status: 'active' }],
      },
    } as unknown as Request;

    expect(() => controller.me(req)).toThrow(ForbiddenException);
    expect(getContext).not.toHaveBeenCalled();
  });
});
