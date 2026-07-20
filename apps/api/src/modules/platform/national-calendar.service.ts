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
      .select('id, bs_year, status, weekly_offs')
      .order('bs_year', { ascending: false });
    if (error) {
      throw new BadRequestException(error.message);
    }
    const result = [];
    for (const cal of calendars ?? []) {
      const closures = await this.listClosures(cal.id as string);
      result.push(this.mapCalendar(cal, closures));
    }
    return { calendars: result };
  }

  async getCalendar(id: string) {
    const client = this.requireClient();
    const { data, error } = await client
      .from('national_calendars')
      .select('id, bs_year, status, weekly_offs')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      throw new BadRequestException(error.message);
    }
    if (!data) {
      throw new NotFoundException('National calendar not found');
    }
    return this.mapCalendar(data, await this.listClosures(data.id as string));
  }

  async createDraft(dto: CreateNationalCalendarDto) {
    const client = this.requireClient();
    const { data, error } = await client
      .from('national_calendars')
      .insert({ bs_year: dto.bsYear, status: 'draft', weekly_offs: [6] })
      .select('id, bs_year, status, weekly_offs')
      .single();
    if (error || !data) {
      throw new BadRequestException(error?.message ?? 'Failed to create national calendar');
    }
    return this.mapCalendar(data, []);
  }

  async upsertClosures(calendarId: string, closures: UpsertNationalClosureDto[]) {
    const calendar = await this.getCalendar(calendarId);
    const client = this.requireClient();
    const existing = await this.listClosures(calendarId);
    const keptIds = new Set(
      closures.map((c) => c.id).filter((id): id is string => Boolean(id)),
    );
    const toDelete = existing.filter((row) => !keptIds.has(row.id)).map((row) => row.id);
    if (toDelete.length > 0) {
      const { error: deleteError } = await client
        .from('national_closures')
        .delete()
        .eq('national_calendar_id', calendarId)
        .in('id', toDelete);
      if (deleteError) {
        throw new BadRequestException(deleteError.message);
      }
    }
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

  async patchWeeklyOffs(calendarId: string, weeklyOffs: number[]) {
    const normalized = this.normalizeWeeklyOffs(weeklyOffs);
    const client = this.requireClient();
    const existing = await this.getCalendar(calendarId);
    const { data, error } = await client
      .from('national_calendars')
      .update({ weekly_offs: normalized })
      .eq('id', calendarId)
      .select('id, bs_year, status, weekly_offs')
      .single();
    if (error || !data) {
      throw new BadRequestException(error?.message ?? 'Failed to update weekly offs');
    }
    return this.mapCalendar(data, existing.closures);
  }

  async publish(calendarId: string) {
    const client = this.requireClient();
    const calendar = await this.getCalendar(calendarId);
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
      .select('id, bs_year, status, weekly_offs')
      .single();
    if (error || !data) {
      throw new BadRequestException(error?.message ?? 'Failed to publish');
    }
    return this.mapCalendar(data, await this.listClosures(data.id as string));
  }

  /**
   * Return a published calendar to draft so closures / weekly offs can be edited.
   * While draft, its closures are excluded from teaching_days until republished.
   */
  async unpublish(calendarId: string) {
    const calendar = await this.getCalendar(calendarId);
    if (calendar.status === 'draft') {
      return calendar;
    }
    const client = this.requireClient();
    const { data, error } = await client
      .from('national_calendars')
      .update({ status: 'draft' })
      .eq('id', calendarId)
      .select('id, bs_year, status, weekly_offs')
      .single();
    if (error || !data) {
      throw new BadRequestException(error?.message ?? 'Failed to unpublish');
    }
    return this.mapCalendar(data, calendar.closures);
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

  /**
   * Published national weekly-off preset for a BS year.
   * Schools copy this into school_calendars.weekly_offs at setup (overridable later).
   */
  async getPublishedWeeklyOffs(bsYear: number): Promise<number[] | null> {
    const client = this.requireClient();
    const { data, error } = await client
      .from('national_calendars')
      .select('weekly_offs')
      .eq('bs_year', bsYear)
      .eq('status', 'published')
      .maybeSingle();
    if (error) {
      throw new BadRequestException(error.message);
    }
    if (!data) {
      return null;
    }
    return this.normalizeWeeklyOffs((data.weekly_offs as number[] | null) ?? []);
  }

  private normalizeWeeklyOffs(weeklyOffs: number[]): number[] {
    const unique = [
      ...new Set(weeklyOffs.filter((d) => Number.isInteger(d) && d >= 1 && d <= 7)),
    ].sort((a, b) => a - b);
    return unique.length > 0 ? unique : [6];
  }

  private mapCalendar(
    row: {
      id: unknown;
      bs_year: unknown;
      status: unknown;
      weekly_offs?: unknown;
    },
    closures: ReturnType<NationalCalendarService['mapClosure']>[],
  ) {
    return {
      id: row.id as string,
      bsYear: row.bs_year as number,
      status: row.status as 'draft' | 'published',
      weeklyOffs: this.normalizeWeeklyOffs((row.weekly_offs as number[] | null) ?? []),
      closures,
    };
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
