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
  SUBSTITUTE_BLOCKS_CONFIRMATION_KEY,
  type SectionSubjectScopeOptions,
} from '../decorators/require-section-subject-scope.decorator';
import type { RequestUser } from '../../auth/types/request-user.types';

@Injectable()
export class SubstituteRoleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabase: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const blocksConfirmation = this.reflector.getAllAndOverride<boolean | undefined>(
      SUBSTITUTE_BLOCKS_CONFIRMATION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!blocksConfirmation) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as RequestUser | undefined;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }
    const scopeOptions = this.reflector.getAllAndOverride<SectionSubjectScopeOptions | undefined>(
      SECTION_SUBJECT_SCOPE_KEY,
      [context.getHandler(), context.getClass()],
    );
    const sectionId = scopeOptions
      ? await this.resolveSectionId(request, scopeOptions)
      : undefined;
    if (!sectionId) {
      return true;
    }
    const client = this.supabase.getClient();
    if (!client) {
      throw new ForbiddenException('Database unavailable');
    }
    const nowIso = new Date().toISOString();
    const { data, error } = await client
      .from('substitute_access')
      .select('id')
      .eq('identity_id', user.identityId)
      .eq('section_id', sectionId)
      .lte('starts_at', nowIso)
      .gte('expires_at', nowIso)
      .maybeSingle();
    if (error) {
      throw new ForbiddenException('Failed to evaluate substitute access');
    }
    if (data) {
      throw new ForbiddenException('Substitute teachers cannot confirm outcomes');
    }
    return true;
  }

  private async resolveSectionId(
    request: Request,
    options: SectionSubjectScopeOptions,
  ): Promise<string | undefined> {
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
    if (options.entityLookup) {
      const id = request.params[options.entityLookup.idParam];
      if (typeof id !== 'string') {
        return undefined;
      }
      const client = this.supabase.getClient();
      if (!client) {
        throw new ForbiddenException('Database unavailable');
      }
      const sectionColumn = options.entityLookup.sectionColumn ?? 'section_id';
      const { data, error } = await client
        .from(options.entityLookup.table)
        .select(sectionColumn)
        .eq('id', id)
        .maybeSingle();
      if (error) {
        throw new ForbiddenException('Failed to resolve section for substitute check');
      }
      if (!data || typeof data !== 'object') {
        return undefined;
      }
      const sectionId = (data as Record<string, unknown>)[sectionColumn];
      return typeof sectionId === 'string' ? sectionId : undefined;
    }
    return undefined;
  }
}
