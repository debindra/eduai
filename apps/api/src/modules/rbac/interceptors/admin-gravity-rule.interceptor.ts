import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable, map } from 'rxjs';
import type { RequestUser } from '../../auth/types/request-user.types';

const FORBIDDEN_ADMIN_KEYS = new Set([
  'ratings',
  'bandDistributions',
  'childNames',
  'ratingDistribution',
  'bandDistribution',
  'studentNames',
  'outcomeRatings',
]);

@Injectable()
export class AdminGravityRuleInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as RequestUser | undefined;
    const isAdmin = user?.memberships.some(
      (membership) => membership.memberType === 'admin' && membership.status === 'active',
    );
    if (!isAdmin) {
      return next.handle();
    }
    return next.handle().pipe(map((data: unknown) => this.stripForbiddenKeys(data)));
  }

  private stripForbiddenKeys(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.stripForbiddenKeys(item));
    }
    if (value !== null && typeof value === 'object') {
      const input = value as Record<string, unknown>;
      const output: Record<string, unknown> = {};
      for (const [key, nestedValue] of Object.entries(input)) {
        if (FORBIDDEN_ADMIN_KEYS.has(key)) {
          continue;
        }
        output[key] = this.stripForbiddenKeys(nestedValue);
      }
      return output;
    }
    return value;
  }
}
