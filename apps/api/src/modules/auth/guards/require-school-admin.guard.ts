import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
  REQUIRE_SCHOOL_ADMIN_KEY,
  type RequireSchoolAdminOptions,
} from '../decorators/require-school-admin.decorator';
import type { RequestUser } from '../types/request-user.types';

@Injectable()
export class RequireSchoolAdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RequireSchoolAdminOptions | undefined>(
      REQUIRE_SCHOOL_ADMIN_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!options) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as RequestUser | undefined;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }
    const schoolId = this.resolveSchoolId(request, options);
    if (!schoolId) {
      throw new ForbiddenException('School scope is required');
    }
    const isSchoolAdmin = user.memberships.some(
      (membership) =>
        membership.status === 'active' &&
        membership.memberType === 'admin' &&
        membership.schoolId === schoolId,
    );
    if (!isSchoolAdmin) {
      throw new ForbiddenException('Admin membership required for this school');
    }
    return true;
  }

  private resolveSchoolId(
    request: Request,
    options: RequireSchoolAdminOptions,
  ): string | null {
    if (options.schoolIdParam) {
      const value = request.params[options.schoolIdParam];
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }
    if (options.schoolIdBody && request.body && typeof request.body === 'object') {
      const body = request.body as Record<string, unknown>;
      const value = body[options.schoolIdBody];
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }
    return null;
  }
}
