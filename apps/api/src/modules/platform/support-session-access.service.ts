import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { AuditService } from './audit.service';

export type AuthorizeSupportAccessInput = {
  platformAdminId: string;
  identityId: string;
  schoolId: string;
  resourcePath: string;
};

/**
 * Checks for an active, unexpired support_session and appends audit_log on success.
 */
@Injectable()
export class SupportSessionAccessService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly audit: AuditService,
  ) {}

  async authorizeAndAudit(input: AuthorizeSupportAccessInput): Promise<boolean> {
    const client = this.requireClient();
    const now = new Date().toISOString();
    const { data, error } = await client
      .from('support_sessions')
      .select('id, status, starts_at, expires_at')
      .eq('platform_admin_id', input.platformAdminId)
      .eq('school_id', input.schoolId)
      .eq('status', 'active')
      .lte('starts_at', now)
      .gt('expires_at', now)
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      throw new BadRequestException(`Failed to resolve support session: ${error.message}`);
    }
    if (!data) {
      return false;
    }
    await this.audit.append({
      actorIdentityId: input.identityId,
      action: 'platform.support_session.access',
      scope: {
        schoolId: input.schoolId,
        supportSessionId: data.id,
        resourcePath: input.resourcePath,
      },
      justificationRef: data.id as string,
    });
    return true;
  }

  private requireClient() {
    const client = this.supabase.getClient();
    if (!client) {
      throw new BadRequestException('Database is not configured');
    }
    return client;
  }
}
