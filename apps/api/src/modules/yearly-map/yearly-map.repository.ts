import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';

@Injectable()
export class YearlyMapRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private client() {
    const c = this.supabase.getClient();
    if (!c) throw new Error('Supabase is not configured');
    return c;
  }

  async findMapForSection(sectionId: string) {
    const { data, error } = await this.client()
      .from('yearly_map')
      .select('*')
      .eq('section_id', sectionId)
      .neq('status', 'superseded')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async listTeachingDays(schoolCalendarId: string) {
    const { data, error } = await this.client()
      .from('teaching_days')
      .select('terminal_id, day_index')
      .eq('school_calendar_id', schoolCalendarId)
      .order('day_index', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async listTerminals(schoolCalendarId: string) {
    const { data, error } = await this.client()
      .from('terminals')
      .select('id, sort_order')
      .eq('school_calendar_id', schoolCalendarId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async deleteSlices(yearlyMapId: string) {
    const { error } = await this.client().from('map_slices').delete().eq('yearly_map_id', yearlyMapId);
    if (error) throw error;
  }

  async insertSlices(
    rows: Array<{
      yearly_map_id: string;
      terminal_id: string;
      teaching_day_index: number;
      theme_or_chapter: string;
      outcome_refs: string[];
    }>,
  ) {
    if (rows.length === 0) return [];
    const { data, error } = await this.client().from('map_slices').insert(rows).select('id, teaching_day_index, theme_or_chapter, terminal_id, outcome_refs');
    if (error) throw error;
    return data ?? [];
  }

  async insertSliceOutcomes(rows: Array<{ map_slice_id: string; outcome_id: string }>) {
    if (rows.length === 0) return;
    const { error } = await this.client().from('map_slice_outcomes').insert(rows);
    if (error) throw error;
  }

  async listSlices(yearlyMapId: string) {
    const { data, error } = await this.client()
      .from('map_slices')
      .select('id, terminal_id, teaching_day_index, theme_or_chapter, outcome_refs')
      .eq('yearly_map_id', yearlyMapId)
      .order('teaching_day_index', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async approveMap(yearlyMapId: string) {
    await this.client()
      .from('yearly_map')
      .update({ status: 'superseded' })
      .eq('status', 'approved')
      .neq('id', yearlyMapId);
    const { data, error } = await this.client()
      .from('yearly_map')
      .update({ status: 'approved' })
      .eq('id', yearlyMapId)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async createDraftMap(schoolCalendarId: string, sectionId: string) {
    const { data, error } = await this.client()
      .from('yearly_map')
      .insert({
        school_calendar_id: schoolCalendarId,
        section_id: sectionId,
        subject_id: null,
        status: 'draft',
      })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }
}
