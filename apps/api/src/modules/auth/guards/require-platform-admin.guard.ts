import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { REQUIRE_PLATFORM_ADMIN_KEY } from '../decorators/require-platform-admin.decorator';
import type { RequestUser } from '../types/request-user.types';

@Injectable()
export class RequirePlatformAdminGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean | undefined>(
      REQUIRE_PLATFORM_ADMIN_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as RequestUser | undefined;
    if (!user?.platformAdmin) {
      throw new ForbiddenException('Platform admin required');
    }
    return true;
  }
}
