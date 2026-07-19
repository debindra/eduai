import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import type { CalendarSetupDto } from './dto/calendar-setup.dto';
import type { FestivalClosureDto } from './dto/calendar-response.dto';

interface SchoolCalendarRow {
  id: string;
  school_id: string;
  academic_year_label: string;
  session_start: string;
  session_end: string;
  weekly_offs: number[];
  approval_status: string;
  approved_at: string | null;
}

interface TerminalRow {
  id: string;
  school_calendar_id: string;
  name: string;
  sort_order: number;
  start_date: string;
  end_date: string;
  reporting_type: string;
}

interface ClosureRow {
  id: string;
  school_calendar_id: string;
  name: string;
  start_date: string;
  end_date: string;
  source: string;
  category: string;
  school_activity_id: string | null;
}

const CLOSURE_SELECT =
  'id, school_calendar_id, name, start_date, end_date, source, category, school_activity_id';

interface TeachingDayRow {
  terminal_id: string;
  school_calendar_id: string;
  school_id: string;
  day: string;
  day_index: number;
}

@Injectable()
export class CalendarRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private client() {
    const client = this.supabase.getClient();
    if (!client) {
      throw new Error('Database is not configured');
    }
    return client;
  }

  async findDraftCalendar(schoolId: string): Promise<SchoolCalendarRow | null> {
    const { data, error } = await this.client()
      .from('school_calendars')
      .select(
        'id, school_id, academic_year_label, session_start, session_end, weekly_offs, approval_status, approved_at',
      )
      .eq('school_id', schoolId)
      .eq('approval_status', 'draft')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return (data as SchoolCalendarRow | null) ?? null;
  }

  async findLatestCalendar(schoolId: string): Promise<SchoolCalendarRow | null> {
    const { data, error } = await this.client()
      .from('school_calendars')
      .select(
        'id, school_id, academic_year_label, session_start, session_end, weekly_offs, approval_status, approved_at',
      )
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return (data as SchoolCalendarRow | null) ?? null;
  }

  /** Latest approved calendar for the school (preferred for shared view). */
  async findApprovedCalendar(schoolId: string): Promise<SchoolCalendarRow | null> {
    const { data, error } = await this.client()
      .from('school_calendars')
      .select(
        'id, school_id, academic_year_label, session_start, session_end, weekly_offs, approval_status, approved_at',
      )
      .eq('school_id', schoolId)
      .eq('approval_status', 'approved')
      .order('approved_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return (data as SchoolCalendarRow | null) ?? null;
  }

  async insertCalendar(
    schoolId: string,
    dto: CalendarSetupDto,
  ): Promise<SchoolCalendarRow> {
    const { data, error } = await this.client()
      .from('school_calendars')
      .insert({
        school_id: schoolId,
        academic_year_label: dto.academicYearLabel,
        session_start: dto.sessionStart,
        session_end: dto.sessionEnd,
        weekly_offs: dto.weeklyOffs,
        approval_status: 'draft',
      })
      .select(
        'id, school_id, academic_year_label, session_start, session_end, weekly_offs, approval_status, approved_at',
      )
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create calendar');
    }
    return data as SchoolCalendarRow;
  }

  async insertTerminals(
    schoolCalendarId: string,
    terminals: CalendarSetupDto['terminals'],
  ): Promise<TerminalRow[]> {
    const rows = terminals.map((terminal) => ({
      school_calendar_id: schoolCalendarId,
      name: terminal.name,
      sort_order: terminal.sortOrder,
      start_date: terminal.startDate,
      end_date: terminal.endDate,
      reporting_type: terminal.reportingType,
    }));
    const { data, error } = await this.client()
      .from('terminals')
      .insert(rows)
      .select('id, school_calendar_id, name, sort_order, start_date, end_date, reporting_type');
    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create terminals');
    }
    return data as TerminalRow[];
  }

  async insertFestivalClosures(
    schoolCalendarId: string,
    closures: Array<{ name: string; startDate: string; endDate: string }>,
  ): Promise<ClosureRow[]> {
    const rows = closures.map((closure) => ({
      school_calendar_id: schoolCalendarId,
      name: closure.name,
      start_date: closure.startDate,
      end_date: closure.endDate,
      source: 'festival_template',
      category: 'school_holiday',
    }));
    const { data, error } = await this.client()
      .from('calendar_closures')
      .insert(rows)
      .select(CLOSURE_SELECT);
    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to seed festival closures');
    }
    return data as ClosureRow[];
  }

  async listFestivalClosures(schoolCalendarId: string): Promise<ClosureRow[]> {
    const { data, error } = await this.client()
      .from('calendar_closures')
      .select(CLOSURE_SELECT)
      .eq('school_calendar_id', schoolCalendarId)
      .eq('source', 'festival_template')
      .order('start_date', { ascending: true });
    if (error) {
      throw new Error(error.message);
    }
    return (data as ClosureRow[]) ?? [];
  }

  /** All school-scoped closures (local / manual / legacy festival_template). */
  async listSchoolClosures(schoolCalendarId: string): Promise<ClosureRow[]> {
    const { data, error } = await this.client()
      .from('calendar_closures')
      .select(CLOSURE_SELECT)
      .eq('school_calendar_id', schoolCalendarId)
      .order('start_date', { ascending: true });
    if (error) {
      throw new Error(error.message);
    }
    return (data as ClosureRow[]) ?? [];
  }

  async deleteLocalClosure(
    schoolCalendarId: string,
    closureId: string,
  ): Promise<void> {
    const { error } = await this.client()
      .from('calendar_closures')
      .delete()
      .eq('id', closureId)
      .eq('school_calendar_id', schoolCalendarId);
    if (error) {
      throw new Error(error.message);
    }
  }

  async upsertFestivalClosure(
    schoolCalendarId: string,
    closure: FestivalClosureDto,
  ): Promise<ClosureRow> {
    return this.upsertLocalClosure(schoolCalendarId, closure);
  }

  /** Upsert a school local/manual closure — never writes national rows. */
  async upsertLocalClosure(
    schoolCalendarId: string,
    closure: FestivalClosureDto,
  ): Promise<ClosureRow> {
    const source = 'local';
    const category = closure.category;
    const schoolActivityId =
      closure.schoolActivityId === undefined
        ? undefined
        : closure.schoolActivityId;
    if (closure.id) {
      const patch: Record<string, unknown> = {
        name: closure.name,
        start_date: closure.startDate,
        end_date: closure.endDate,
        source,
        category,
      };
      if (schoolActivityId !== undefined) {
        patch.school_activity_id = schoolActivityId;
      }
      const { data, error } = await this.client()
        .from('calendar_closures')
        .update(patch)
        .eq('id', closure.id)
        .eq('school_calendar_id', schoolCalendarId)
        .select(CLOSURE_SELECT)
        .single();
      if (error || !data) {
        throw new Error(error?.message ?? 'Failed to update local closure');
      }
      return data as ClosureRow;
    }
    const { data, error } = await this.client()
      .from('calendar_closures')
      .insert({
        school_calendar_id: schoolCalendarId,
        name: closure.name,
        start_date: closure.startDate,
        end_date: closure.endDate,
        source,
        category,
        school_activity_id: schoolActivityId ?? null,
      })
      .select(CLOSURE_SELECT)
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create local closure');
    }
    return data as ClosureRow;
  }

  async approveCalendar(
    schoolCalendarId: string,
    approvedBy: string,
  ): Promise<SchoolCalendarRow> {
    const approvedAt = new Date().toISOString();
    const { data, error } = await this.client()
      .from('school_calendars')
      .update({
        approval_status: 'approved',
        approved_at: approvedAt,
        approved_by: approvedBy,
      })
      .eq('id', schoolCalendarId)
      .select(
        'id, school_id, academic_year_label, session_start, session_end, weekly_offs, approval_status, approved_at',
      )
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to approve calendar');
    }
    return data as SchoolCalendarRow;
  }

  /** Mark live approved calendars for this school+year as superseded (before promoting a draft). */
  async supersedeApprovedForSchoolYear(
    schoolId: string,
    academicYearLabel: string,
  ): Promise<void> {
    const { error } = await this.client()
      .from('school_calendars')
      .update({ approval_status: 'superseded' })
      .eq('school_id', schoolId)
      .eq('academic_year_label', academicYearLabel)
      .eq('approval_status', 'approved');
    if (error) {
      throw new Error(error.message);
    }
  }

  async updateDraftCalendar(
    schoolCalendarId: string,
    dto: CalendarSetupDto,
  ): Promise<SchoolCalendarRow> {
    const { data, error } = await this.client()
      .from('school_calendars')
      .update({
        academic_year_label: dto.academicYearLabel,
        session_start: dto.sessionStart,
        session_end: dto.sessionEnd,
        weekly_offs: dto.weeklyOffs,
      })
      .eq('id', schoolCalendarId)
      .eq('approval_status', 'draft')
      .select(
        'id, school_id, academic_year_label, session_start, session_end, weekly_offs, approval_status, approved_at',
      )
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to update draft calendar');
    }
    return data as SchoolCalendarRow;
  }

  async deleteTerminalsForCalendar(schoolCalendarId: string): Promise<void> {
    const { error } = await this.client()
      .from('terminals')
      .delete()
      .eq('school_calendar_id', schoolCalendarId);
    if (error) {
      throw new Error(error.message);
    }
  }

  /** Copy closures onto a new calendar (new ids). */
  async copyClosures(
    sourceCalendarId: string,
    targetCalendarId: string,
  ): Promise<ClosureRow[]> {
    const source = await this.listSchoolClosures(sourceCalendarId);
    if (source.length === 0) {
      return [];
    }
    const rows = source.map((closure) => ({
      school_calendar_id: targetCalendarId,
      name: closure.name,
      start_date: closure.start_date,
      end_date: closure.end_date,
      source: closure.source,
      category: closure.category,
      school_activity_id: closure.school_activity_id,
    }));
    const { data, error } = await this.client()
      .from('calendar_closures')
      .insert(rows)
      .select(CLOSURE_SELECT);
    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to copy closures');
    }
    return data as ClosureRow[];
  }

  async listTerminals(schoolCalendarId: string): Promise<TerminalRow[]> {
    const { data, error } = await this.client()
      .from('terminals')
      .select('id, school_calendar_id, name, sort_order, start_date, end_date, reporting_type')
      .eq('school_calendar_id', schoolCalendarId)
      .order('sort_order', { ascending: true });
    if (error) {
      throw new Error(error.message);
    }
    return (data as TerminalRow[]) ?? [];
  }

  async listTeachingDays(schoolId: string): Promise<TeachingDayRow[]> {
    const { data, error } = await this.client()
      .from('teaching_days')
      .select('terminal_id, school_calendar_id, school_id, day, day_index')
      .eq('school_id', schoolId);
    if (error) {
      throw new Error(error.message);
    }
    return (data as TeachingDayRow[]) ?? [];
  }
}
