import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';

export type AuditAppendInput = {
  actorIdentityId: string;
  action: string;
  scope?: Record<string, unknown>;
  justificationRef?: string | null;
};

/** Service-role append-only writer for audit_log (first Nest consumer). */
@Injectable()
export class AuditService {
  constructor(private readonly supabase: SupabaseService) {}

  async append(input: AuditAppendInput): Promise<void> {
    const client = this.requireClient();
    const { error } = await client.from('audit_log').insert({
      actor_identity_id: input.actorIdentityId,
      action: input.action,
      scope: input.scope ?? {},
      justification_ref: input.justificationRef ?? null,
    });
    if (error) {
      throw new BadRequestException(`Failed to append audit_log: ${error.message}`);
    }
  }

  private requireClient() {
    const client = this.supabase.getClient();
    if (!client) {
      throw new BadRequestException('Database is not configured');
    }
    return client;
  }
}
