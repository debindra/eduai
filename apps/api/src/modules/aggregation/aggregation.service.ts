import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import {
  aggregateRatings,
  aggregateSubjectFromAreas,
  computeAreaAchievement,
  type AggregateResult,
  type AreaAchievementResult,
  type LetterCutoff,
  type RatingInput,
} from './aggregate';

@Injectable()
export class AggregationRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private client() {
    const c = this.supabase.getClient();
    if (!c) throw new Error('Supabase is not configured');
    return c;
  }

  async findSectionBand(sectionId: string) {
    const { data, error } = await this.client()
      .from('sections')
      .select('id, band_id')
      .eq('id', sectionId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async listLetterCutoffs(bandId: string): Promise<LetterCutoff[]> {
    const { data, error } = await this.client()
      .from('grade_scales')
      .select('code, min_percent, max_percent, sort_order')
      .eq('band_id', bandId)
      .eq('kind', 'letter')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      code: r.code as string,
      minPercent: Number(r.min_percent),
      maxPercent: Number(r.max_percent),
      sortOrder: r.sort_order as number,
    }));
  }

  async listRatingNumericMap(bandId: string): Promise<Map<string, number>> {
    const { data, error } = await this.client()
      .from('grade_scales')
      .select('code, numeric_value')
      .eq('band_id', bandId)
      .eq('kind', 'rating');
    if (error) throw error;
    const map = new Map<string, number>();
    for (const r of data ?? []) {
      map.set(r.code as string, Number(r.numeric_value));
    }
    return map;
  }

  async listConfirmedOutcomesForChild(
    childId: string,
    subjectId?: string | null,
  ) {
    let query = this.client()
      .from('student_outcomes')
      .select('id, rating_code, state, subject_id, attempt')
      .eq('child_id', childId)
      .eq('state', 'confirmed');
    if (subjectId !== undefined) {
      if (subjectId === null) {
        query = query.is('subject_id', null);
      } else {
        query = query.eq('subject_id', subjectId);
      }
    }
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }

  async findChild(childId: string) {
    const { data, error } = await this.client()
      .from('children')
      .select('id, section_id, name, roll_number')
      .eq('id', childId)
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
      .select('id, code')
      .eq('assessment_area_id', areaId)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }

  async listConfirmedRatingsForChildArea(childId: string, areaId: string) {
    const { data, error } = await this.client()
      .from('ratings')
      .select('id, rating, state, created_at, indicators!inner(id, code, assessment_area_id)')
      .eq('child_id', childId)
      .eq('state', 'confirmed')
      .eq('indicators.assessment_area_id', areaId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  }

  async listAreasForSubject(subjectId: string, levelId: number) {
    const { data, error } = await this.client()
      .from('assessment_areas')
      .select('id, code, indicator_count, default_sequence')
      .eq('subject_id', subjectId)
      .eq('level_id', levelId)
      .order('default_sequence', { ascending: true });
    if (error) throw error;
    return data ?? [];
  }
}

@Injectable()
export class AggregationService {
  constructor(private readonly repository: AggregationRepository) {}

  /**
   * Legacy flat aggregation over student_outcomes (pre–v3.3 path).
   * Per-child only — never ranks across children.
   */
  async aggregateChild(
    childId: string,
    subjectId?: string | null,
  ): Promise<AggregateResult & { childId: string; sectionId: string }> {
    const child = await this.repository.findChild(childId);
    if (!child) throw new NotFoundException('Child not found');
    const section = await this.repository.findSectionBand(child.section_id as string);
    if (!section) throw new NotFoundException('Section not found');

    const [cutoffs, ratingMap, outcomes] = await Promise.all([
      this.repository.listLetterCutoffs(section.band_id as string),
      this.repository.listRatingNumericMap(section.band_id as string),
      this.repository.listConfirmedOutcomesForChild(childId, subjectId),
    ]);

    if (cutoffs.length === 0) {
      throw new BadRequestException(
        'Band has no letter grade cut-offs configured (aggregation_rule requires kind=letter rows)',
      );
    }

    const ratings: RatingInput[] = outcomes.map((o) => {
      const code = o.rating_code as string;
      const numeric = ratingMap.get(code);
      if (numeric === undefined) {
        throw new BadRequestException(`Unknown rating_code ${code} for band`);
      }
      return { ratingCode: code, numericValue: numeric, state: o.state as string };
    });

    const result = aggregateRatings(ratings, cutoffs);
    return {
      ...result,
      childId,
      sectionId: child.section_id as string,
    };
  }

  /**
   * I6–I8: area achievement from annex indicator_count.
   * Incomplete → withheld (never a partial %).
   */
  async aggregateArea(
    childId: string,
    areaId: string,
  ): Promise<
    AreaAchievementResult & { childId: string; areaId: string; areaCode: string }
  > {
    const child = await this.repository.findChild(childId);
    if (!child) throw new NotFoundException('Child not found');
    const area = await this.repository.findArea(areaId);
    if (!area) throw new NotFoundException('Assessment area not found');

    const [indicators, ratingRows] = await Promise.all([
      this.repository.listIndicatorsForArea(areaId),
      this.repository.listConfirmedRatingsForChildArea(childId, areaId),
    ]);

    const codes = indicators.map((i) => i.code as string);
    const latestByCode = new Map<string, { rating: number; state: string }>();
    for (const row of ratingRows) {
      const ind = row.indicators as unknown as { code: string };
      const code = ind?.code;
      if (!code || latestByCode.has(code)) continue;
      latestByCode.set(code, {
        rating: Number(row.rating),
        state: row.state as string,
      });
    }

    const result = computeAreaAchievement(
      Number(area.indicator_count),
      codes,
      [...latestByCode.entries()].map(([indicatorCode, v]) => ({
        indicatorCode,
        rating: v.rating,
        state: v.state,
      })),
    );

    return {
      ...result,
      childId,
      areaId,
      areaCode: area.code as string,
    };
  }

  /**
   * Subject overall from area achievements. Any withheld area → withheld subject.
   */
  async aggregateSubjectByAreas(
    childId: string,
    subjectId: string,
    levelId: number,
  ) {
    const child = await this.repository.findChild(childId);
    if (!child) throw new NotFoundException('Child not found');
    const section = await this.repository.findSectionBand(child.section_id as string);
    if (!section) throw new NotFoundException('Section not found');

    const [cutoffs, areas] = await Promise.all([
      this.repository.listLetterCutoffs(section.band_id as string),
      this.repository.listAreasForSubject(subjectId, levelId),
    ]);

    if (cutoffs.length === 0) {
      throw new BadRequestException('Band has no letter grade cut-offs configured');
    }
    if (areas.length === 0) {
      throw new BadRequestException('No assessment areas for subject/level');
    }

    const areaResults: AreaAchievementResult[] = [];
    for (const area of areas) {
      const areaAgg = await this.aggregateArea(childId, area.id as string);
      const { childId: _c, areaId: _a, areaCode: _ac, ...rest } = areaAgg;
      areaResults.push(rest);
    }

    const subject = aggregateSubjectFromAreas(areaResults, cutoffs);
    return {
      ...subject,
      childId,
      subjectId,
      levelId,
      sectionId: child.section_id as string,
    };
  }
}
