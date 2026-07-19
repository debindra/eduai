import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { RequestUser } from '../../auth/types/request-user.types';
import {
  PLATFORM_SUPPORT_SESSION_KEY,
  type PlatformSupportSessionOptions,
} from '../decorators/require-platform-support-session.decorator';
import { SupportSessionAccessService } from '../support-session-access.service';

/**
 * For platform callers: require an active support_session for the target school
 * and append audit_log. Non-platform callers pass through (other guards apply).
 */
@Injectable()
export class PlatformSupportSessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supportSessions: SupportSessionAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<
      PlatformSupportSessionOptions | undefined
    >(PLATFORM_SUPPORT_SESSION_KEY, [context.getHandler(), context.getClass()]);
    if (!options) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as RequestUser | undefined;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }
    if (!user.platformAdmin) {
      return true;
    }
    const schoolId = this.resolveSchoolId(request, options);
    if (!schoolId) {
      throw new ForbiddenException('School scope is required for support-session access');
    }
    const allowed = await this.supportSessions.authorizeAndAudit({
      platformAdminId: user.platformAdmin.id,
      identityId: user.identityId,
      schoolId,
      resourcePath: `${request.method} ${request.path}`,
    });
    if (!allowed) {
      throw new ForbiddenException(
        'Active support session required for platform drill-down into this school',
      );
    }
    return true;
  }

  private resolveSchoolId(
    request: Request,
    options: PlatformSupportSessionOptions,
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
