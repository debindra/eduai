import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import type {
  CreateNationalCalendarDto,
  UpsertNationalClosureDto,
} from './dto/national-calendar.dto';

/** Deterministic national calendar CRUD — zero AI calls. */
@Injectable()
export class NationalCalendarService {
  constructor(private readonly supabase: SupabaseService) {}

  async listCalendars() {
    const client = this.requireClient();
    const { data: calendars, error } = await client
      .from('national_calendars')
      .select('id, bs_year, status')
      .order('bs_year', { ascending: false });
    if (error) {
      throw new BadRequestException(error.message);
    }
    const result = [];
    for (const cal of calendars ?? []) {
      const closures = await this.listClosures(cal.id as string);
      result.push({
        id: cal.id as string,
        bsYear: cal.bs_year as number,
        status: cal.status as 'draft' | 'published',
        closures,
      });
    }
    return { calendars: result };
  }

  async getCalendar(id: string) {
    const client = this.requireClient();
    const { data, error } = await client
      .from('national_calendars')
      .select('id, bs_year, status')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      throw new BadRequestException(error.message);
    }
    if (!data) {
      throw new NotFoundException('National calendar not found');
    }
    return {
      id: data.id as string,
      bsYear: data.bs_year as number,
      status: data.status as 'draft' | 'published',
      closures: await this.listClosures(data.id as string),
    };
  }

  async createDraft(dto: CreateNationalCalendarDto) {
    const client = this.requireClient();
    const { data, error } = await client
      .from('national_calendars')
      .insert({ bs_year: dto.bsYear, status: 'draft' })
      .select('id, bs_year, status')
      .single();
    if (error || !data) {
      throw new BadRequestException(error?.message ?? 'Failed to create national calendar');
    }
    return {
      id: data.id as string,
      bsYear: data.bs_year as number,
      status: 'draft' as const,
      closures: [],
    };
  }

  async upsertClosures(calendarId: string, closures: UpsertNationalClosureDto[]) {
    const calendar = await this.getCalendar(calendarId);
    if (calendar.status === 'published') {
      // Closures remain editable; teaching_days VIEW recomputes on read.
    }
    const client = this.requireClient();
    const updated = [];
    for (const closure of closures) {
      if (closure.id) {
        const { data, error } = await client
          .from('national_closures')
          .update({
            name: closure.name,
            category: closure.category,
            start_date: closure.startDate,
            end_date: closure.endDate,
            bs_label: closure.bsLabel ?? null,
            movable: closure.movable ?? false,
          })
          .eq('id', closure.id)
          .eq('national_calendar_id', calendarId)
          .select('id, name, category, start_date, end_date, bs_label, movable')
          .single();
        if (error || !data) {
          throw new BadRequestException(error?.message ?? 'Failed to update closure');
        }
        updated.push(this.mapClosure(data));
      } else {
        const { data, error } = await client
          .from('national_closures')
          .insert({
            national_calendar_id: calendarId,
            name: closure.name,
            category: closure.category,
            start_date: closure.startDate,
            end_date: closure.endDate,
            bs_label: closure.bsLabel ?? null,
            movable: closure.movable ?? false,
          })
          .select('id, name, category, start_date, end_date, bs_label, movable')
          .single();
        if (error || !data) {
          throw new BadRequestException(error?.message ?? 'Failed to insert closure');
        }
        updated.push(this.mapClosure(data));
      }
    }
    return { ...calendar, closures: updated };
  }

  async publish(calendarId: string) {
    const client = this.requireClient();
    const calendar = await this.getCalendar(calendarId);
    // Demote any other published calendar for this bs_year (partial unique index).
    const { error: demoteError } = await client
      .from('national_calendars')
      .update({ status: 'draft' })
      .eq('bs_year', calendar.bsYear)
      .eq('status', 'published')
      .neq('id', calendarId);
    if (demoteError) {
      throw new BadRequestException(demoteError.message);
    }
    const { data, error } = await client
      .from('national_calendars')
      .update({ status: 'published' })
      .eq('id', calendarId)
      .select('id, bs_year, status')
      .single();
    if (error || !data) {
      throw new BadRequestException(error?.message ?? 'Failed to publish');
    }
    return {
      id: data.id as string,
      bsYear: data.bs_year as number,
      status: 'published' as const,
      closures: await this.listClosures(data.id as string),
    };
  }

  /** Published closures for a BS year — used by school calendar setup. */
  async listPublishedClosuresForBsYear(bsYear: number) {
    const client = this.requireClient();
    const { data: calendar, error } = await client
      .from('national_calendars')
      .select('id')
      .eq('bs_year', bsYear)
      .eq('status', 'published')
      .maybeSingle();
    if (error) {
      throw new BadRequestException(error.message);
    }
    if (!calendar) {
      return [];
    }
    return this.listClosures(calendar.id as string);
  }

  private async listClosures(calendarId: string) {
    const client = this.requireClient();
    const { data, error } = await client
      .from('national_closures')
      .select('id, name, category, start_date, end_date, bs_label, movable')
      .eq('national_calendar_id', calendarId)
      .order('start_date', { ascending: true });
    if (error) {
      throw new BadRequestException(error.message);
    }
    return (data ?? []).map((row) => this.mapClosure(row));
  }

  private mapClosure(row: {
    id: unknown;
    name: unknown;
    category: unknown;
    start_date: unknown;
    end_date: unknown;
    bs_label: unknown;
    movable: unknown;
  }) {
    return {
      id: row.id as string,
      name: row.name as string,
      category: row.category as 'govt_holiday' | 'festival' | 'day_off',
      startDate: row.start_date as string,
      endDate: row.end_date as string,
      bsLabel: (row.bs_label as string | null) ?? null,
      movable: Boolean(row.movable),
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
