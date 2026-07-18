import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { SupabaseService } from '../../../database/supabase.service';
import { AUTH_PROVIDER_PORT, type AuthProviderPort } from '../../../shared/ports/auth-provider.port';
import type { RequestMembership, RequestUser } from '../types/request-user.types';

interface IdentityGuardRow {
  id: string;
  auth_user_id: string;
  email: string | null;
  phone: string | null;
  account_status: string;
}

interface MembershipGuardRow {
  id: string;
  school_id: string;
  member_type: string;
  status: string;
}

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly supabase: SupabaseService,
    @Inject(AUTH_PROVIDER_PORT) private readonly authProvider: AuthProviderPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const authUser = await this.authProvider.getUserFromToken(token);
    if (!authUser) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    const client = this.supabase.getClient();
    if (!client) {
      throw new UnauthorizedException('Auth service unavailable');
    }
    const { data: identity, error: identityError } = await client
      .from('identities')
      .select('id, auth_user_id, email, phone, account_status')
      .eq('auth_user_id', authUser.id)
      .maybeSingle();
    if (identityError || !identity) {
      throw new UnauthorizedException('Identity not found');
    }
    const identityRow = identity as IdentityGuardRow;
    if (identityRow.account_status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }
    const { data: memberships, error: membershipError } = await client
      .from('school_memberships')
      .select('id, school_id, member_type, status')
      .eq('identity_id', identityRow.id)
      .eq('status', 'active');
    if (membershipError) {
      throw new UnauthorizedException('Failed to resolve memberships');
    }
    const resolvedMemberships = await this.resolveProfiles(
      client,
      (memberships ?? []) as MembershipGuardRow[],
    );
    const requestUser: RequestUser = {
      identityId: identityRow.id,
      authUserId: identityRow.auth_user_id,
      accountStatus: identityRow.account_status as RequestUser['accountStatus'],
      email: identityRow.email,
      phone: identityRow.phone,
      memberships: resolvedMemberships,
    };
    request.user = requestUser;
    return true;
  }

  private async resolveProfiles(
    client: NonNullable<ReturnType<SupabaseService['getClient']>>,
    memberships: MembershipGuardRow[],
  ): Promise<RequestMembership[]> {
    const results: RequestMembership[] = [];
    for (const membership of memberships) {
      let teacherId: string | null = null;
      let adminId: string | null = null;
      if (membership.member_type === 'teacher') {
        const { data } = await client
          .from('teachers')
          .select('id')
          .eq('membership_id', membership.id)
          .maybeSingle();
        teacherId = data?.id ?? null;
      }
      if (membership.member_type === 'admin') {
        const { data } = await client
          .from('school_admins')
          .select('id')
          .eq('membership_id', membership.id)
          .maybeSingle();
        adminId = data?.id ?? null;
      }
      results.push({
        id: membership.id,
        schoolId: membership.school_id,
        memberType: membership.member_type as RequestMembership['memberType'],
        status: membership.status as RequestMembership['status'],
        teacherId,
        adminId,
      });
    }
    return results;
  }

  private extractBearerToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return null;
    }
    return header.slice('Bearer '.length).trim();
  }
}
