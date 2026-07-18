import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { SupabaseService } from '../../../database/supabase.service';
import {
  SECTION_SUBJECT_SCOPE_KEY,
  type SectionSubjectScopeOptions,
} from '../decorators/require-section-subject-scope.decorator';
import type { RequestUser } from '../../auth/types/request-user.types';

@Injectable()
export class SectionReadGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabase: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<SectionSubjectScopeOptions | undefined>(
      SECTION_SUBJECT_SCOPE_KEY,
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
    const teacherId = this.resolveTeacherId(user);
    if (!teacherId) {
      throw new ForbiddenException('Teacher profile required');
    }
    const sectionId = this.resolveSectionId(request, options);
    if (!sectionId) {
      throw new ForbiddenException('Section scope is required');
    }
    const client = this.supabase.getClient();
    if (!client) {
      throw new ForbiddenException('Database unavailable');
    }
    const { data, error } = await client
      .from('teacher_sections')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('section_id', sectionId)
      .maybeSingle();
    if (error || !data) {
      throw new ForbiddenException('Section read scope denied');
    }
    return true;
  }

  private resolveTeacherId(user: RequestUser): string | null {
    const teacherMembership = user.memberships.find(
      (membership) => membership.memberType === 'teacher' && membership.teacherId,
    );
    return teacherMembership?.teacherId ?? null;
  }

  private resolveSectionId(request: Request, options: SectionSubjectScopeOptions): string | undefined {
    if (options.sectionIdParam) {
      const value = request.params[options.sectionIdParam];
      if (typeof value === 'string') {
        return value;
      }
    }
    if (options.sectionIdBody && request.body && typeof request.body === 'object') {
      const body = request.body as Record<string, unknown>;
      const value = body[options.sectionIdBody];
      if (typeof value === 'string') {
        return value;
      }
    }
    return undefined;
  }
}
