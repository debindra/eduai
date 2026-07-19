import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
  REQUIRE_SCHOOL_MEMBER_KEY,
  type RequireSchoolMemberOptions,
} from '../decorators/require-school-member.decorator';
import type { RequestUser } from '../types/request-user.types';
import { SupportSessionAccessService } from '../../platform/support-session-access.service';

/**
 * Allows school admin/teacher for the target school, OR a platform super admin
 * with an active support_session for that school (audited).
 */
@Injectable()
export class RequireSchoolMemberGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supportSessions: SupportSessionAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RequireSchoolMemberOptions | undefined>(
      REQUIRE_SCHOOL_MEMBER_KEY,
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
    const isMember = user.memberships.some(
      (membership) =>
        membership.status === 'active' &&
        membership.schoolId === schoolId &&
        (membership.memberType === 'admin' || membership.memberType === 'teacher'),
    );
    if (isMember) {
      return true;
    }
    if (user.platformAdmin) {
      const allowed = await this.supportSessions.authorizeAndAudit({
        platformAdminId: user.platformAdmin.id,
        identityId: user.identityId,
        schoolId,
        resourcePath: `${request.method} ${request.path}`,
      });
      if (allowed) {
        return true;
      }
      throw new ForbiddenException(
        'Active support session required for platform drill-down into this school',
      );
    }
    throw new ForbiddenException('School membership required');
  }

  private resolveSchoolId(
    request: Request,
    options: RequireSchoolMemberOptions,
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
    if (options.schoolIdQuery) {
      const value = request.query[options.schoolIdQuery];
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }
    return null;
  }
}
