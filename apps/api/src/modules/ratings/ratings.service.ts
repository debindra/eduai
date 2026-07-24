import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';

const TOP_RATING = 4;

@Injectable()
export class RatingsRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private client() {
    const c = this.supabase.getClient();
    if (!c) throw new Error('Supabase is not configured');
    return c;
  }

  async listAreas(subjectId: string, levelId: number) {
    const { data, error } = await this.client()
      .from('assessment_areas')
      .select('id, subject_id, level_id, code, display_label, grouping_shape, default_sequence, indicator_count')
      .eq('subject_id', subjectId)
      .eq('level_id', levelId)
      .order('default_sequence', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async findIndicator(indicatorId: string) {
    const { data, error } = await this.client()
      .from('indicators')
      .select('id, code, assessment_area_id, level_id')
      .eq('id', indicatorId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async findArea(areaId: string) {
    const { data, error } = await this.client()
      .from('assessment_areas')
      .select('id, subject_id, level_id, code, indicator_count, display_label')
      .eq('id', areaId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async listIndicatorsForArea(areaId: string) {
    const { data, error } = await this.client()
      .from('indicators')
      .select('id, code, statement_en, group_label, sort_order')
      .eq('assessment_area_id', areaId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async insertProposed(row: {
    child_id: string;
    indicator_id: string;
    stage: 'regular' | 'additional_support';
    rated_on: string;
    rating: number;
    capture_mode: string | null;
    author_id: string | null;
  }) {
    const { data, error } = await this.client()
      .from('ratings')
      .insert({
        ...row,
        state: 'proposed',
      })
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  async findById(id: string) {
    const { data, error } = await this.client()
      .from('ratings')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async confirm(id: string, identityId: string) {
    const { data, error } = await this.client()
      .from('ratings')
      .update({
        state: 'confirmed',
        confirmed_by: identityId,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('state', 'proposed')
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }

  /**
   * I7: correction = new INSERT of a confirmed rating (never UPDATE prior).
   */
  async insertCorrection(row: {
    child_id: string;
    indicator_id: string;
    stage: 'regular' | 'additional_support';
    rated_on: string;
    rating: number;
    capture_mode: string | null;
    author_id: string | null;
    confirmed_by: string;
  }) {
    const { data, error } = await this.client()
      .from('ratings')
      .insert({
        child_id: row.child_id,
        indicator_id: row.indicator_id,
        stage: row.stage,
        rated_on: row.rated_on,
        rating: row.rating,
        capture_mode: row.capture_mode,
        author_id: row.author_id,
        state: 'proposed',
      })
      .select('*')
      .single();
    if (error) throw error;
    // Caller confirms explicitly — keep propose/confirm split
    return data;
  }

  async listConfirmedForChildArea(childId: string, areaId: string) {
    const { data, error } = await this.client()
      .from('ratings')
      .select('id, indicator_id, rating, state, stage, rated_on, created_at, indicators!inner(code, assessment_area_id)')
      .eq('child_id', childId)
      .eq('state', 'confirmed')
      .eq('indicators.assessment_area_id', areaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }
}

@Injectable()
export class RatingsService {
  constructor(private readonly repository: RatingsRepository) {}

  async propose(input: {
    childId: string;
    indicatorId: string;
    rating: number;
    stage?: 'regular' | 'additional_support';
    captureMode?: string | null;
    authorId?: string | null;
    ratedOn?: string;
  }) {
    if (input.rating < 1 || input.rating > 4) {
      throw new BadRequestException('I2: rating must be 1–4 per Guideline 2083');
    }
    if (input.rating === TOP_RATING) {
      throw new BadRequestException(
        'Cannot jump to top rating (4) from one sighting — mapper guard',
      );
    }
    const indicator = await this.repository.findIndicator(input.indicatorId);
    if (!indicator) throw new NotFoundException('Indicator not found');

    return this.repository.insertProposed({
      child_id: input.childId,
      indicator_id: input.indicatorId,
      stage: input.stage ?? 'regular',
      rated_on: input.ratedOn ?? new Date().toISOString().slice(0, 10),
      rating: input.rating,
      capture_mode: input.captureMode ?? null,
      author_id: input.authorId ?? null,
    });
  }

  async confirm(proposalId: string, identityId: string) {
    const row = await this.repository.findById(proposalId);
    if (!row) throw new NotFoundException('Rating proposal not found');
    if (row.state !== 'proposed') {
      throw new BadRequestException('Only proposed ratings can be confirmed');
    }
    return this.repository.confirm(proposalId, identityId);
  }

  /**
   * I7 correction path: propose a new row (never update confirmed).
   * Top-band still blocked on propose unless teacher confirms after review.
   */
  async proposeCorrection(input: {
    childId: string;
    indicatorId: string;
    rating: number;
    stage?: 'regular' | 'additional_support';
    captureMode?: string | null;
    authorId?: string | null;
  }) {
    if (input.rating < 1 || input.rating > 4) {
      throw new BadRequestException('I2: rating must be 1–4 per Guideline 2083');
    }
    return this.repository.insertCorrection({
      child_id: input.childId,
      indicator_id: input.indicatorId,
      stage: input.stage ?? 'regular',
      rated_on: new Date().toISOString().slice(0, 10),
      rating: input.rating,
      capture_mode: input.captureMode ?? 'correction',
      author_id: input.authorId ?? null,
      confirmed_by: input.authorId ?? '',
    });
  }

  async listAreaIndicators(areaId: string) {
    const area = await this.repository.findArea(areaId);
    if (!area) throw new NotFoundException('Assessment area not found');
    const indicators = await this.repository.listIndicatorsForArea(areaId);
    return { area, indicators };
  }

  async listAreas(subjectId: string, levelId: number) {
    if (!Number.isInteger(levelId) || levelId < 1) {
      throw new BadRequestException('levelId must be a positive integer');
    }
    return this.repository.listAreas(subjectId, levelId);
  }

  async proposeBatch(
    items: Array<{
      childId: string;
      indicatorId: string;
      rating: number;
      stage?: 'regular' | 'additional_support';
      captureMode?: string | null;
    }>,
    authorId: string | null,
  ) {
    const proposed = [];
    for (const item of items) {
      proposed.push(
        await this.propose({
          childId: item.childId,
          indicatorId: item.indicatorId,
          rating: item.rating,
          stage: item.stage,
          captureMode: item.captureMode ?? 'batch_sweep',
          authorId,
        }),
      );
    }
    return { proposed };
  }
}
