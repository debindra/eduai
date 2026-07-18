import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../../database/supabase.service';
import { DocgenClient } from '../../shared/docgen-client';

const DEFAULT_RETENTION_DAYS = 90;

@Injectable()
export class ExitRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private client() {
    const c = this.supabase.getClient();
    if (!c) throw new Error('Supabase is not configured');
    return c;
  }

  async findChild(childId: string) {
    const { data, error } = await this.client()
      .from('children')
      .select('id, section_id, name, status')
      .eq('id', childId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async findSchool(schoolId: string) {
    const { data, error } = await this.client()
      .from('schools')
      .select('id, name, exit_status, exit_requested_at, deletion_scheduled_at')
      .eq('id', schoolId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async initiateExit(schoolId: string, exitRequestedAt: string, deletionScheduledAt: string) {
    const { data, error } = await this.client()
      .from('schools')
      .update({
        exit_status: 'pending_deletion',
        exit_requested_at: exitRequestedAt,
        deletion_scheduled_at: deletionScheduledAt,
      })
      .eq('id', schoolId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async listSchoolsPastDeletion(asOfIso: string) {
    const { data, error } = await this.client()
      .from('schools')
      .select('id, exit_status, deletion_scheduled_at')
      .eq('exit_status', 'pending_deletion')
      .lte('deletion_scheduled_at', asOfIso);
    if (error) throw error;
    return data ?? [];
  }

  async markDeleted(schoolId: string) {
    const { data, error } = await this.client()
      .from('schools')
      .update({ exit_status: 'deleted' })
      .eq('id', schoolId)
      .eq('exit_status', 'pending_deletion')
      .select('id, exit_status')
      .single();
    if (error) throw error;
    return data;
  }
}

@Injectable()
export class ExitService {
  private docgen: DocgenClient;

  constructor(
    private readonly repository: ExitRepository,
    private readonly config: ConfigService,
  ) {
    const baseUrl = this.config.get<string>('DOCGEN_URL') ?? 'http://localhost:3002';
    this.docgen = new DocgenClient(baseUrl);
  }

  /** For tests — inject a stub client. */
  setDocgenClient(client: DocgenClient): void {
    this.docgen = client;
  }

  async createLeavingPack(childId: string) {
    const child = await this.repository.findChild(childId);
    if (!child) throw new NotFoundException('Child not found');
    // Calls DocGen — does not duplicate rendering logic.
    const result = await this.docgen.renderLeavingPack(childId);
    return {
      childId,
      documentRenderId: result.documentRenderId,
      sourceRowHash: result.sourceRowHash,
      storageRef: result.storageRef,
      templateType: result.templateType,
    };
  }

  async initiateSchoolExit(schoolId: string, retentionDays = DEFAULT_RETENTION_DAYS) {
    const school = await this.repository.findSchool(schoolId);
    if (!school) throw new NotFoundException('School not found');
    const exitRequestedAt = new Date();
    const deletionScheduledAt = new Date(
      exitRequestedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000,
    );
    const updated = await this.repository.initiateExit(
      schoolId,
      exitRequestedAt.toISOString(),
      deletionScheduledAt.toISOString(),
    );
    return {
      schoolId: updated.id as string,
      exitStatus: updated.exit_status as string,
      exitRequestedAt: updated.exit_requested_at as string,
      deletionScheduledAt: updated.deletion_scheduled_at as string,
    };
  }

  /**
   * Callable from a scheduler later — no job engine wired yet.
   * Only deletes schools past deletion_scheduled_at with exit_status pending_deletion.
   */
  async runDeletionSweep(asOf = new Date()) {
    const due = await this.repository.listSchoolsPastDeletion(asOf.toISOString());
    const deleted: string[] = [];
    for (const school of due) {
      const row = await this.repository.markDeleted(school.id as string);
      deleted.push(row.id as string);
    }
    return { deletedCount: deleted.length, deletedSchoolIds: deleted };
  }
}
