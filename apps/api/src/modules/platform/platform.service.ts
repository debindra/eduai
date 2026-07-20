import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { AuthService } from '../auth/auth.service';
import { CalendarService } from '../calendar/calendar.service';
import type { CalendarSetupDto } from '../calendar/dto/calendar-setup.dto';
import type { PatchFestivalTemplateDto } from '../calendar/dto/calendar-response.dto';
import { AuditService } from './audit.service';
import type {
  CreatePlatformSchoolDto,
  CreateSupportSessionDto,
  PlatformSchoolDto,
} from './dto/platform.dto';

/** Keep PostgREST `.in(...)` URLs under practical limits. */
const IN_QUERY_CHUNK_SIZE = 200;

type CalendarStatus = 'none' | 'draft' | 'approved';

@Injectable()
export class PlatformService {
  private readonly logger = new Logger(PlatformService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly authService: AuthService,
    private readonly audit: AuditService,
    @Inject(forwardRef(() => CalendarService))
    private readonly calendarService: CalendarService,
  ) {}

  async listSchools(): Promise<{ schools: PlatformSchoolDto[] }> {
    const client = this.requireClient();
    const { data: schools, error } = await client
      .from('schools')
      .select('id, name, region, tier, licensed_band_range, exit_status')
      .order('name', { ascending: true });
    if (error) {
      throw new BadRequestException(error.message);
    }
    const schoolRows = schools ?? [];
    if (schoolRows.length === 0) {
      return { schools: [] };
    }
    const schoolIds = schoolRows.map((school) => school.id as string);
    const [
      { data: sectionRows, error: secError },
      { data: calendarRows, error: calError },
      { data: membershipRows, error: memError },
    ] = await Promise.all([
      client.from('sections').select('id, school_id').in('school_id', schoolIds),
      client
        .from('school_calendars')
        .select('school_id, approval_status')
        .in('school_id', schoolIds),
      client
        .from('school_memberships')
        .select('school_id, member_type')
        .in('school_id', schoolIds)
        .eq('member_type', 'teacher')
        .eq('status', 'active'),
    ]);
    if (secError) {
      throw new BadRequestException(secError.message);
    }
    if (calError) {
      throw new BadRequestException(calError.message);
    }
    if (memError) {
      throw new BadRequestException(memError.message);
    }
    const { sectionsTotalBySchool, sectionIdsBySchool, allSectionIds } =
      this.indexSections(sectionRows ?? []);
    const teachersTotalBySchool = this.countBySchoolId(membershipRows ?? []);
    const calendarStatusBySchool = this.resolveCalendarStatus(
      schoolIds,
      calendarRows ?? [],
    );
    const { studentsTotalBySchool, subjectsTotalBySchool } =
      await this.loadSectionAggregates(client, sectionIdsBySchool, allSectionIds);
    const result = schoolRows.map((school) => {
      const schoolId = school.id as string;
      const sectionsTotal = sectionsTotalBySchool.get(schoolId) ?? 0;
      const calendarStatus = calendarStatusBySchool.get(schoolId) ?? 'none';
      // Shape only: "behind" = no approved calendar yet (counts, never distributions).
      const sectionsBehind = calendarStatus === 'approved' ? 0 : sectionsTotal;
      return {
        id: schoolId,
        name: school.name as string,
        region: (school.region as string | null) ?? null,
        tier: (school.tier as string | null) ?? null,
        licensedBandRange: (school.licensed_band_range as string | null) ?? null,
        exitStatus: (school.exit_status as string | null) ?? null,
        calendarStatus,
        sectionsTotal,
        sectionsBehind,
        teachersTotal: teachersTotalBySchool.get(schoolId) ?? 0,
        studentsTotal: studentsTotalBySchool.get(schoolId) ?? 0,
        subjectsTotal: subjectsTotalBySchool.get(schoolId) ?? 0,
      };
    });
    return { schools: result };
  }

  async createSchool(actorIdentityId: string, dto: CreatePlatformSchoolDto) {
    // Defense in depth: DTO transform/XOR already applied; re-check for direct service calls.
    const name = dto.name?.trim() ?? '';
    const adminEmail = dto.adminEmail?.trim() || undefined;
    const adminPhone = dto.adminPhone?.trim() || undefined;
    if (!name) {
      throw new BadRequestException('School name is required');
    }
    if (!adminEmail && !adminPhone) {
      throw new BadRequestException('Either adminEmail or adminPhone is required');
    }
    if (adminEmail && adminPhone) {
      throw new BadRequestException('Provide adminEmail or adminPhone, not both');
    }
    const client = this.requireClient();
    const { data: school, error: schoolError } = await client
      .from('schools')
      .insert({
        name,
        region: dto.region?.trim() || null,
        tier: dto.tier?.trim() || null,
        licensed_band_range: dto.licensedBandRange?.trim() || null,
        exit_status: null,
      })
      .select('id, name, region, tier, licensed_band_range, exit_status')
      .single();
    if (schoolError || !school) {
      throw new BadRequestException(schoolError?.message ?? 'Failed to create school');
    }
    const schoolId = school.id as string;
    let invite: { identityId: string; delivery: 'email' | 'mobile' };
    try {
      invite = await this.authService.invite({
        schoolId,
        memberType: 'admin',
        email: adminEmail,
        phone: adminPhone,
        displayName: dto.adminDisplayName?.trim() || undefined,
      });
    } catch (err) {
      const { error: deleteError } = await client.from('schools').delete().eq('id', schoolId);
      if (deleteError) {
        throw new BadRequestException(
          `Invite failed (${err instanceof Error ? err.message : String(err)}) and school rollback failed (${deleteError.message}). Orphan schoolId=${schoolId}`,
        );
      }
      throw err;
    }
    // Audit must not undo a successful provision.
    try {
      await this.audit.append({
        actorIdentityId,
        action: 'platform.school.created',
        scope: {
          schoolId,
          adminIdentityId: invite.identityId,
          delivery: invite.delivery,
        },
      });
    } catch (auditError) {
      this.logger.warn(
        `School ${schoolId} created but audit_log append failed: ${
          auditError instanceof Error ? auditError.message : String(auditError)
        }`,
      );
    }
    const schoolDto: PlatformSchoolDto = {
      id: schoolId,
      name: school.name as string,
      region: (school.region as string | null) ?? null,
      tier: (school.tier as string | null) ?? null,
      licensedBandRange: (school.licensed_band_range as string | null) ?? null,
      exitStatus: (school.exit_status as string | null) ?? null,
      calendarStatus: 'none',
      sectionsTotal: 0,
      sectionsBehind: 0,
      teachersTotal: 0,
      studentsTotal: 0,
      subjectsTotal: 0,
    };
    return {
      school: schoolDto,
      admin: {
        identityId: invite.identityId,
        delivery: invite.delivery,
      },
    };
  }

  async setupSchoolCalendar(
    actorIdentityId: string,
    schoolId: string,
    dto: CalendarSetupDto,
  ) {
    await this.requireSchool(schoolId);
    const result = await this.calendarService.setupCalendar(schoolId, dto);
    try {
      await this.audit.append({
        actorIdentityId,
        action: 'platform.school.calendar_setup',
        scope: {
          schoolId,
          schoolCalendarId: result.schoolCalendarId,
          academicYearLabel: result.academicYearLabel,
        },
      });
    } catch (auditError) {
      this.logger.warn(
        `Calendar setup for school ${schoolId} succeeded but audit failed: ${
          auditError instanceof Error ? auditError.message : String(auditError)
        }`,
      );
    }
    return result;
  }

  async ensureSchoolCalendarDraft(actorIdentityId: string, schoolId: string) {
    await this.requireSchool(schoolId);
    const result = await this.calendarService.ensureEditableDraft(schoolId);
    try {
      await this.audit.append({
        actorIdentityId,
        action: 'platform.school.calendar_ensure_draft',
        scope: {
          schoolId,
          schoolCalendarId: result.schoolCalendarId,
          clonedFromApproved: result.clonedFromApproved,
        },
      });
    } catch (auditError) {
      this.logger.warn(
        `Ensure draft for school ${schoolId} succeeded but audit failed: ${
          auditError instanceof Error ? auditError.message : String(auditError)
        }`,
      );
    }
    return result;
  }

  async updateSchoolCalendarSetup(
    actorIdentityId: string,
    schoolId: string,
    dto: CalendarSetupDto,
  ) {
    await this.requireSchool(schoolId);
    const result = await this.calendarService.updateDraftSetup(schoolId, dto);
    try {
      await this.audit.append({
        actorIdentityId,
        action: 'platform.school.calendar_setup_update',
        scope: {
          schoolId,
          schoolCalendarId: result.schoolCalendarId,
          academicYearLabel: result.academicYearLabel,
        },
      });
    } catch (auditError) {
      this.logger.warn(
        `Calendar setup update for school ${schoolId} succeeded but audit failed: ${
          auditError instanceof Error ? auditError.message : String(auditError)
        }`,
      );
    }
    return result;
  }

  async getSchoolCalendarClosures(schoolId: string) {
    await this.requireSchool(schoolId);
    return this.calendarService.getFestivalTemplate(schoolId);
  }

  async patchSchoolCalendarClosures(
    actorIdentityId: string,
    schoolId: string,
    dto: PatchFestivalTemplateDto,
  ) {
    await this.requireSchool(schoolId);
    const result = await this.calendarService.patchFestivalTemplate(schoolId, dto);
    try {
      await this.audit.append({
        actorIdentityId,
        action: 'platform.school.calendar_closures',
        scope: {
          schoolId,
          schoolCalendarId: result.schoolCalendarId,
          closureCount: result.closures.length,
        },
      });
    } catch (auditError) {
      this.logger.warn(
        `Closures for school ${schoolId} saved but audit failed: ${
          auditError instanceof Error ? auditError.message : String(auditError)
        }`,
      );
    }
    return result;
  }

  async approveSchoolCalendar(actorIdentityId: string, schoolId: string) {
    await this.requireSchool(schoolId);
    const result = await this.calendarService.approveCalendar(schoolId, actorIdentityId);
    try {
      await this.audit.append({
        actorIdentityId,
        action: 'platform.school.calendar_approved',
        scope: {
          schoolId,
          schoolCalendarId: result.schoolCalendarId,
        },
      });
    } catch (auditError) {
      this.logger.warn(
        `Calendar approve for school ${schoolId} succeeded but audit failed: ${
          auditError instanceof Error ? auditError.message : String(auditError)
        }`,
      );
    }
    return result;
  }

  async getSchoolCalendarTeachingDays(schoolId: string) {
    await this.requireSchool(schoolId);
    return this.calendarService.getTeachingDays(schoolId);
  }

  private async requireSchool(schoolId: string): Promise<{ id: string; name: string }> {
    const client = this.requireClient();
    const { data: school, error } = await client
      .from('schools')
      .select('id, name')
      .eq('id', schoolId)
      .maybeSingle();
    if (error) {
      throw new BadRequestException(error.message);
    }
    if (!school) {
      throw new NotFoundException('School not found');
    }
    return { id: school.id as string, name: school.name as string };
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

  private indexSections(sectionRows: Array<{ id: unknown; school_id: unknown }>) {
    const sectionsTotalBySchool = new Map<string, number>();
    const sectionIdsBySchool = new Map<string, string[]>();
    const allSectionIds: string[] = [];
    for (const row of sectionRows) {
      const schoolId = row.school_id as string;
      const sectionId = row.id as string;
      sectionsTotalBySchool.set(schoolId, (sectionsTotalBySchool.get(schoolId) ?? 0) + 1);
      const list = sectionIdsBySchool.get(schoolId) ?? [];
      list.push(sectionId);
      sectionIdsBySchool.set(schoolId, list);
      allSectionIds.push(sectionId);
    }
    return { sectionsTotalBySchool, sectionIdsBySchool, allSectionIds };
  }

  private countBySchoolId(rows: Array<{ school_id: unknown }>): Map<string, number> {
    const totals = new Map<string, number>();
    for (const row of rows) {
      const schoolId = row.school_id as string;
      totals.set(schoolId, (totals.get(schoolId) ?? 0) + 1);
    }
    return totals;
  }

  private resolveCalendarStatus(
    schoolIds: string[],
    calendarRows: Array<{ school_id: unknown; approval_status: unknown }>,
  ): Map<string, CalendarStatus> {
    const calendarStatusBySchool = new Map<string, CalendarStatus>();
    for (const schoolId of schoolIds) {
      calendarStatusBySchool.set(schoolId, 'none');
    }
    for (const row of calendarRows) {
      const schoolId = row.school_id as string;
      const status = row.approval_status as string;
      if (status === 'superseded') {
        continue;
      }
      const current = calendarStatusBySchool.get(schoolId) ?? 'none';
      // Draft wins when both draft and approved exist (editors work on draft).
      if (status === 'draft') {
        calendarStatusBySchool.set(schoolId, 'draft');
      } else if (status === 'approved' && current !== 'draft') {
        calendarStatusBySchool.set(schoolId, 'approved');
      }
    }
    return calendarStatusBySchool;
  }

  private async loadSectionAggregates(
    client: ReturnType<PlatformService['requireClient']>,
    sectionIdsBySchool: Map<string, string[]>,
    allSectionIds: string[],
  ): Promise<{
    studentsTotalBySchool: Map<string, number>;
    subjectsTotalBySchool: Map<string, number>;
  }> {
    const studentsTotalBySchool = new Map<string, number>();
    const subjectsTotalBySchool = new Map<string, number>();
    if (allSectionIds.length === 0) {
      return { studentsTotalBySchool, subjectsTotalBySchool };
    }
    const schoolBySection = new Map<string, string>();
    for (const [schoolId, sectionIds] of sectionIdsBySchool) {
      for (const sectionId of sectionIds) {
        schoolBySection.set(sectionId, schoolId);
      }
    }
    const [childRows, tsRows] = await Promise.all([
      this.selectInChunks(client, 'children', 'id, section_id', 'section_id', allSectionIds, {
        status: 'active',
      }),
      this.selectInChunks(
        client,
        'teacher_sections',
        'section_id, subject_id',
        'section_id',
        allSectionIds,
        { subjectNotNull: true },
      ),
    ]);
    for (const row of childRows) {
      const schoolId = schoolBySection.get(row.section_id as string);
      if (!schoolId) continue;
      studentsTotalBySchool.set(schoolId, (studentsTotalBySchool.get(schoolId) ?? 0) + 1);
    }
    const subjectsBySchool = new Map<string, Set<string>>();
    for (const row of tsRows) {
      const schoolId = schoolBySection.get(row.section_id as string);
      const subjectId = row.subject_id as string | null;
      if (!schoolId || !subjectId) continue;
      const set = subjectsBySchool.get(schoolId) ?? new Set<string>();
      set.add(subjectId);
      subjectsBySchool.set(schoolId, set);
    }
    for (const [schoolId, set] of subjectsBySchool) {
      subjectsTotalBySchool.set(schoolId, set.size);
    }
    return { studentsTotalBySchool, subjectsTotalBySchool };
  }

  /**
   * Chunked `.in(column, ids)` reads. Filters: `status` eq, or `subjectNotNull`.
   */
  private async selectInChunks(
    client: ReturnType<PlatformService['requireClient']>,
    table: string,
    columns: string,
    inColumn: string,
    ids: string[],
    filters?: { status?: string; subjectNotNull?: boolean },
  ): Promise<Array<Record<string, unknown>>> {
    const rows: Array<Record<string, unknown>> = [];
    for (let i = 0; i < ids.length; i += IN_QUERY_CHUNK_SIZE) {
      const chunk = ids.slice(i, i + IN_QUERY_CHUNK_SIZE);
      let query = client.from(table).select(columns).in(inColumn, chunk);
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.subjectNotNull) {
        query = query.not('subject_id', 'is', null);
      }
      const { data, error } = await query;
      if (error) {
        throw new BadRequestException(error.message);
      }
      for (const row of data ?? []) {
        rows.push(row as unknown as Record<string, unknown>);
      }
    }
    return rows;
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
