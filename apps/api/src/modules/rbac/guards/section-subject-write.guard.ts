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
export class SectionSubjectWriteGuard implements CanActivate {
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
    const sectionId = this.resolveScopeValue(request, options.sectionIdParam, options.sectionIdBody);
    const subjectId = this.resolveScopeValue(request, options.subjectIdParam, options.subjectIdBody);
    if (!sectionId) {
      throw new ForbiddenException('Section scope is required');
    }
    const client = this.supabase.getClient();
    if (!client) {
      throw new ForbiddenException('Database unavailable');
    }
    let query = client
      .from('teacher_sections')
      .select('id')
      .eq('teacher_id', teacherId)
      .eq('section_id', sectionId);
    if (subjectId === undefined) {
      query = query.is('subject_id', null);
    } else if (subjectId === null) {
      query = query.is('subject_id', null);
    } else {
      query = query.eq('subject_id', subjectId);
    }
    const { data, error } = await query.maybeSingle();
    if (error || !data) {
      throw new ForbiddenException('Write scope denied for section/subject grain');
    }
    return true;
  }

  private resolveTeacherId(user: RequestUser): string | null {
    const teacherMembership = user.memberships.find(
      (membership) => membership.memberType === 'teacher' && membership.teacherId,
    );
    return teacherMembership?.teacherId ?? null;
  }

  private resolveScopeValue(
    request: Request,
    paramKey?: string,
    bodyKey?: string,
  ): string | null | undefined {
    if (paramKey) {
      const value = request.params[paramKey];
      if (typeof value === 'string') {
        return value === 'null' ? null : value;
      }
    }
    if (bodyKey && request.body && typeof request.body === 'object') {
      const body = request.body as Record<string, unknown>;
      if (!(bodyKey in body)) {
        return undefined;
      }
      const value = body[bodyKey];
      if (value === null) {
        return null;
      }
      if (typeof value === 'string') {
        return value;
      }
    }
    return undefined;
  }
}
