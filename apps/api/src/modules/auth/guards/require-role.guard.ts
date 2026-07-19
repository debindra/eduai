import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { REQUIRE_ROLE_KEY } from '../decorators/require-role.decorator';
import {
  REQUIRE_SCHOOL_ADMIN_KEY,
  type RequireSchoolAdminOptions,
} from '../decorators/require-school-admin.decorator';
import type { MemberType, RequestUser } from '../types/request-user.types';

@Injectable()
export class RequireRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<MemberType[] | undefined>(
      REQUIRE_ROLE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as RequestUser | undefined;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }
    const hasRole = user.memberships.some(
      (membership) =>
        membership.status === 'active' && requiredRoles.includes(membership.memberType),
    );
    // Platform may pass @RequireRole('admin') only when @RequireSchoolAdmin is also
    // present — RequireSchoolAdminGuard then enforces an active support session.
    const schoolAdminOptions = this.reflector.getAllAndOverride<
      RequireSchoolAdminOptions | undefined
    >(REQUIRE_SCHOOL_ADMIN_KEY, [context.getHandler(), context.getClass()]);
    const platformAsAdmin =
      requiredRoles.includes('admin') &&
      user.platformAdmin !== null &&
      schoolAdminOptions != null;
    if (!hasRole && !platformAsAdmin) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
