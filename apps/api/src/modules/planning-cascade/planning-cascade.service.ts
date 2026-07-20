import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { YearlyMapService } from '../yearly-map/yearly-map.service';

function startOfWeekSunday(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - day);
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class PlanningCascadeRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private client() {
    const c = this.supabase.getClient();
    if (!c) throw new Error('Supabase is not configured');
    return c;
  }

  async listOverrides(sectionId: string, weekStart: string) {
    const { data, error } = await this.client()
      .from('weekly_plan_overrides')
      .select('*')
      .eq('section_id', sectionId)
      .eq('week_start', weekStart);
    if (error) throw error;
    return data ?? [];
  }

  async upsertOverride(row: {
    section_id: string;
    week_start: string;
    day_date: string;
    theme_or_chapter: string | null;
    notes: string | null;
    updated_by: string | null;
  }) {
    const { data, error } = await this.client()
      .from('weekly_plan_overrides')
      .upsert(row, { onConflict: 'section_id,day_date' })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async listTeachingDaysInRange(schoolCalendarId: string, start: string, end: string) {
    const { data, error } = await this.client()
      .from('teaching_days')
      .select('day, day_index, terminal_id')
      .eq('school_calendar_id', schoolCalendarId)
      .gte('day', start)
      .lte('day', end)
      .order('day', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }
}

@Injectable()
export class PlanningCascadeService {
  constructor(
    private readonly yearlyMap: YearlyMapService,
    private readonly repository: PlanningCascadeRepository,
  ) {}

  async getMonthly(sectionId: string, year: number, month: number) {
    const map = await this.yearlyMap.ensureMap(sectionId);
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = new Date(Date.UTC(year, month, 0));
    const end = endDate.toISOString().slice(0, 10);
    const days = await this.repository.listTeachingDaysInRange(map.schoolCalendarId, start, end);
    const byIndex = new Map(map.slices.map((s) => [s.teachingDayIndex, s]));

    return {
      sectionId,
      year,
      month,
      days: days.map((d) => {
        const slice = byIndex.get(d.day_index as number);
        return {
          date: d.day as string,
          teachingDayIndex: d.day_index as number,
          themeOrChapter: slice?.themeOrChapter ?? null,
          mapSliceId: slice?.id ?? null,
        };
      }),
    };
  }

  async getWeekly(sectionId: string, weekStart?: string) {
    const start = weekStart ?? startOfWeekSunday(new Date());
    const startDate = new Date(`${start}T00:00:00Z`);
    const endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 6);
    const end = endDate.toISOString().slice(0, 10);

    const map = await this.yearlyMap.ensureMap(sectionId);
    const days = await this.repository.listTeachingDaysInRange(map.schoolCalendarId, start, end);
    const overrides = await this.repository.listOverrides(sectionId, start);
    const overrideByDate = new Map(
      overrides.map((o) => [o.day_date as string, o]),
    );
    const byIndex = new Map(map.slices.map((s) => [s.teachingDayIndex, s]));

    return {
      sectionId,
      weekStart: start,
      days: days.map((d) => {
        const date = d.day as string;
        const slice = byIndex.get(d.day_index as number);
        const override = overrideByDate.get(date);
        return {
          date,
          teachingDayIndex: d.day_index as number,
          themeOrChapter:
            (override?.theme_or_chapter as string | null) ?? slice?.themeOrChapter ?? null,
          mapSliceId: slice?.id ?? null,
          overridden: Boolean(override),
          notes: (override?.notes as string | null) ?? null,
        };
      }),
    };
  }

  async adjustWeeklyDay(
    sectionId: string,
    dayDate: string,
    themeOrChapter: string,
    teacherId: string | null,
    notes?: string,
  ) {
    const weekStart = startOfWeekSunday(new Date(`${dayDate}T00:00:00Z`));
    await this.repository.upsertOverride({
      section_id: sectionId,
      week_start: weekStart,
      day_date: dayDate,
      theme_or_chapter: themeOrChapter,
      notes: notes ?? null,
      updated_by: teacherId,
    });
    return this.getWeekly(sectionId, weekStart);
  }

  async getDaily(sectionId: string, date: string) {
    const week = await this.getWeekly(sectionId, startOfWeekSunday(new Date(`${date}T00:00:00Z`)));
    const day = week.days.find((d) => d.date === date);
    if (!day) {
      throw new NotFoundException(`No teaching day plan for ${date}`);
    }
    return { sectionId, ...day };
  }
}
