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
}

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
    }));
    const { data, error } = await this.client()
      .from('calendar_closures')
      .insert(rows)
      .select('id, school_calendar_id, name, start_date, end_date, source');
    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to seed festival closures');
    }
    return data as ClosureRow[];
  }

  async listFestivalClosures(schoolCalendarId: string): Promise<ClosureRow[]> {
    const { data, error } = await this.client()
      .from('calendar_closures')
      .select('id, school_calendar_id, name, start_date, end_date, source')
      .eq('school_calendar_id', schoolCalendarId)
      .eq('source', 'festival_template')
      .order('start_date', { ascending: true });
    if (error) {
      throw new Error(error.message);
    }
    return (data as ClosureRow[]) ?? [];
  }

  async upsertFestivalClosure(
    schoolCalendarId: string,
    closure: FestivalClosureDto,
  ): Promise<ClosureRow> {
    if (closure.id) {
      const { data, error } = await this.client()
        .from('calendar_closures')
        .update({
          name: closure.name,
          start_date: closure.startDate,
          end_date: closure.endDate,
          source: 'festival_template',
        })
        .eq('id', closure.id)
        .eq('school_calendar_id', schoolCalendarId)
        .select('id, school_calendar_id, name, start_date, end_date, source')
        .single();
      if (error || !data) {
        throw new Error(error?.message ?? 'Failed to update festival closure');
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
        source: 'festival_template',
      })
      .select('id, school_calendar_id, name, start_date, end_date, source')
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create festival closure');
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
