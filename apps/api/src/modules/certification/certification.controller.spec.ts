import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { RequireRoleGuard } from '../auth/guards/require-role.guard';
import { getMockMembership, getMockRequestUser } from '../../test-utils/factories';
import { CertificationController } from './certification.controller';

// Reads the REAL @RequireRole('admin') metadata off the observation route via a
// live Reflector, so this test breaks if the decorator is ever weakened.
function observationContext(request: Record<string, unknown>) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => CertificationController.prototype.scoreObservation,
    getClass: () => CertificationController,
  };
}

describe('CertificationController observation self-score gate', () => {
  const guard = new RequireRoleGuard(new Reflector());

  it('denies a teacher scoring their own observation (invariant: the level is human, assessor-only)', () => {
    const request = {
      user: getMockRequestUser({
        memberships: [getMockMembership({ memberType: 'teacher' })],
      }),
    };
    expect(() => guard.canActivate(observationContext(request) as never)).toThrow(
      ForbiddenException,
    );
  });

  it('allows an admin/assessor to record the observation', () => {
    const request = {
      user: getMockRequestUser({
        memberships: [
          getMockMembership({ memberType: 'admin', teacherId: null, adminId: 'admin-1' }),
        ],
      }),
    };
    expect(guard.canActivate(observationContext(request) as never)).toBe(true);
  });
});
