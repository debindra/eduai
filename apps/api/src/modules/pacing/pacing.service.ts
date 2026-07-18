import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';

export type PacingState = 'on_track' | 'behind' | 'self_correcting';

@Injectable()
export class PacingRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private client() {
    const c = this.supabase.getClient();
    if (!c) throw new Error('Supabase is not configured');
    return c;
  }

  async findMap(sectionId: string) {
    const { data, error } = await this.client()
      .from('yearly_map')
      .select('id, school_calendar_id')
      .eq('section_id', sectionId)
      .neq('status', 'superseded')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async countSlices(yearlyMapId: string) {
    const { count, error } = await this.client()
      .from('map_slices')
      .select('*', { count: 'exact', head: true })
      .eq('yearly_map_id', yearlyMapId);
    if (error) throw error;
    return count ?? 0;
  }

  async countDone(sectionId: string) {
    const { count, error } = await this.client()
      .from('lesson_progress')
      .select('*', { count: 'exact', head: true })
      .eq('section_id', sectionId)
      .eq('status', 'done');
    if (error) throw error;
    return count ?? 0;
  }

  async countTeachingDaysElapsed(schoolCalendarId: string, asOf: string) {
    const { count, error } = await this.client()
      .from('teaching_days')
      .select('*', { count: 'exact', head: true })
      .eq('school_calendar_id', schoolCalendarId)
      .lte('day', asOf);
    if (error) throw error;
    return count ?? 0;
  }
}

/** Pure pacing math — never joins student_outcomes. */
export function computePacingState(input: {
  plannedIndex: number;
  actualDone: number;
  previouslyBehind: boolean;
}): { gapTeachingDays: number; state: PacingState } {
  const gap = input.plannedIndex - input.actualDone;
  if (gap <= 1) {
    if (input.previouslyBehind && gap <= 0) {
      return { gapTeachingDays: gap, state: 'self_correcting' };
    }
    return { gapTeachingDays: gap, state: 'on_track' };
  }
  return { gapTeachingDays: gap, state: 'behind' };
}

@Injectable()
export class PacingService {
  constructor(private readonly repository: PacingRepository) {}

  async getPacing(sectionId: string, asOf?: string, previouslyBehind = false) {
    const map = await this.repository.findMap(sectionId);
    if (!map) {
      return {
        sectionId,
        plannedIndex: 0,
        actualDone: 0,
        gapTeachingDays: 0,
        state: 'on_track' as PacingState,
        teachingDaysRemaining: 0,
      };
    }

    const date = asOf ?? new Date().toISOString().slice(0, 10);
    const plannedIndex = await this.repository.countTeachingDaysElapsed(
      map.school_calendar_id as string,
      date,
    );
    const actualDone = await this.repository.countDone(sectionId);
    const totalSlices = await this.repository.countSlices(map.id as string);
    const { gapTeachingDays, state } = computePacingState({
      plannedIndex,
      actualDone,
      previouslyBehind,
    });

    return {
      sectionId,
      plannedIndex,
      actualDone,
      gapTeachingDays,
      state,
      teachingDaysRemaining: Math.max(0, totalSlices - actualDone),
    };
  }
}
