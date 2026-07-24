import { ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { AdminGravityRuleInterceptor } from './admin-gravity-rule.interceptor';
import type { RequestUser } from '../../auth/types/request-user.types';

describe('AdminGravityRuleInterceptor', () => {
  const interceptor = new AdminGravityRuleInterceptor();

  it('strips forbidden distribution and child-name keys from admin responses', async () => {
    const request = {
      user: {
        identityId: 'identity-1',
        authUserId: 'auth-1',
        accountStatus: 'active',
        email: 'admin@school.dev',
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
      } satisfies RequestUser,
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
    const payload = {
      sectionCount: 4,
      ratings: [{ childId: 'c1', rating: 'can_do' }],
      bandDistributions: { not_yet: 2 },
      childNames: ['Asha', 'Bikash'],
      nested: {
        shape: { planned: 12, done: 8 },
        studentNames: ['Hidden'],
      },
    };
    const actual = await lastValueFrom(
      interceptor.intercept(context, {
        handle: () => of(payload),
      }),
    );
    expect(actual).toEqual({
      sectionCount: 4,
      nested: {
        shape: { planned: 12, done: 8 },
      },
    });
  });

  it('strips forbidden keys for platform super admins', async () => {
    const request = {
      user: {
        identityId: 'identity-p',
        authUserId: 'auth-p',
        accountStatus: 'active',
        email: 'platform@eduai.dev',
        phone: null,
        memberships: [],
        platformAdmin: { id: 'pa-1', displayName: 'Platform' },
      } satisfies RequestUser,
    };
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as ExecutionContext;
    const payload = {
      schools: [{ id: 's1', sectionsTotal: 2 }],
      bandDistributions: { not_yet: 9 },
      childNames: ['ShouldStrip'],
    };
    const actual = await lastValueFrom(
      interceptor.intercept(context, {
        handle: () => of(payload),
      }),
    );
    expect(actual).toEqual({
      schools: [{ id: 's1', sectionsTotal: 2 }],
    });
  });
});
