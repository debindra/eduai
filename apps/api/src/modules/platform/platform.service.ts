import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import type { CreateSupportSessionDto } from './dto/platform.dto';

@Injectable()
export class PlatformService {
  constructor(private readonly supabase: SupabaseService) {}

  async listSchools() {
    const client = this.requireClient();
    const { data: schools, error } = await client
      .from('schools')
      .select('id, name, region, tier, licensed_band_range, exit_status')
      .order('name', { ascending: true });
    if (error) {
      throw new BadRequestException(error.message);
    }
    const result = [];
    for (const school of schools ?? []) {
      const { count: sectionsTotal, error: secError } = await client
        .from('sections')
        .select('id', { count: 'exact', head: true })
        .eq('school_id', school.id);
      if (secError) {
        throw new BadRequestException(secError.message);
      }
      const { data: calendars, error: calError } = await client
        .from('school_calendars')
        .select('id, approval_status')
        .eq('school_id', school.id);
      if (calError) {
        throw new BadRequestException(calError.message);
      }
      const hasApproved = (calendars ?? []).some((c) => c.approval_status === 'approved');
      // Shape only: "behind" = no approved calendar yet (counts, never distributions).
      const sectionsBehind = hasApproved ? 0 : (sectionsTotal ?? 0);
      result.push({
        id: school.id as string,
        name: school.name as string,
        region: (school.region as string | null) ?? null,
        tier: (school.tier as string | null) ?? null,
        licensedBandRange: (school.licensed_band_range as string | null) ?? null,
        exitStatus: (school.exit_status as string | null) ?? null,
        sectionsTotal: sectionsTotal ?? 0,
        sectionsBehind,
      });
    }
    return { schools: result };
  }

  async createSupportSession(platformAdminId: string, dto: CreateSupportSessionDto) {
    const client = this.requireClient();
    const { data: school, error: schoolError } = await client
      .from('schools')
      .select('id, name')
      .eq('id', dto.schoolId)
      .maybeSingle();
    if (schoolError || !school) {
      throw new NotFoundException('School not found');
    }
    const hours = dto.expiresInHours ?? 4;
    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + hours * 60 * 60 * 1000);
    const { data, error } = await client
      .from('support_sessions')
      .insert({
        platform_admin_id: platformAdminId,
        school_id: dto.schoolId,
        reason: dto.reason,
        granted_by: dto.grantedBy ?? null,
        starts_at: startsAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        status: 'active',
      })
      .select('id, school_id, reason, granted_by, starts_at, expires_at, status')
      .single();
    if (error || !data) {
      throw new BadRequestException(error?.message ?? 'Failed to create support session');
    }
    return this.mapSession(data, school.name as string);
  }

  async listSupportSessions(platformAdminId: string) {
    const client = this.requireClient();
    const { data, error } = await client
      .from('support_sessions')
      .select('id, school_id, reason, granted_by, starts_at, expires_at, status')
      .eq('platform_admin_id', platformAdminId)
      .order('created_at', { ascending: false });
    if (error) {
      throw new BadRequestException(error.message);
    }
    const schoolIds = [...new Set((data ?? []).map((s) => s.school_id as string))];
    const nameById = new Map<string, string>();
    if (schoolIds.length > 0) {
      const { data: schools } = await client.from('schools').select('id, name').in('id', schoolIds);
      for (const s of schools ?? []) {
        nameById.set(s.id as string, s.name as string);
      }
    }
    // Expire stale active sessions on read (deterministic, no job required for v1).
    const now = Date.now();
    const sessions = [];
    for (const row of data ?? []) {
      let status = row.status as string;
      if (status === 'active' && new Date(row.expires_at as string).getTime() <= now) {
        await client
          .from('support_sessions')
          .update({ status: 'expired' })
          .eq('id', row.id)
          .eq('status', 'active');
        status = 'expired';
      }
      sessions.push(this.mapSession({ ...row, status }, nameById.get(row.school_id as string) ?? null));
    }
    return { sessions };
  }

  async revokeSupportSession(platformAdminId: string, sessionId: string) {
    const client = this.requireClient();
    const { data, error } = await client
      .from('support_sessions')
      .update({ status: 'revoked' })
      .eq('id', sessionId)
      .eq('platform_admin_id', platformAdminId)
      .in('status', ['active', 'pending'])
      .select('id, school_id, reason, granted_by, starts_at, expires_at, status')
      .maybeSingle();
    if (error) {
      throw new BadRequestException(error.message);
    }
    if (!data) {
      throw new NotFoundException('Support session not found or not revocable');
    }
    const { data: school } = await client
      .from('schools')
      .select('name')
      .eq('id', data.school_id)
      .maybeSingle();
    return this.mapSession(data, (school?.name as string | undefined) ?? null);
  }

  private mapSession(
    row: {
      id: unknown;
      school_id: unknown;
      reason: unknown;
      granted_by: unknown;
      starts_at: unknown;
      expires_at: unknown;
      status: unknown;
    },
    schoolName: string | null,
  ) {
    return {
      id: row.id as string,
      schoolId: row.school_id as string,
      schoolName,
      reason: row.reason as string,
      grantedBy: (row.granted_by as string | null) ?? null,
      startsAt: row.starts_at as string,
      expiresAt: row.expires_at as string,
      status: row.status as 'pending' | 'active' | 'expired' | 'revoked',
    };
  }

  private requireClient() {
    const client = this.supabase.getClient();
    if (!client) {
      throw new BadRequestException('Database is not configured');
    }
    return client;
  }
}
