import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { BAND_ORDER } from '../out-of-segment/out-of-segment-logic';

export interface BandConfigRow {
  id: string;
  code: string;
  nameEn: string;
  nameNp: string | null;
  assessmentMode: string;
  aggregationRule: string | null;
  gradeRange: string | null;
  gradeScales: Array<{
    id: string;
    code: string;
    labelEn: string;
    labelNp: string | null;
    sortOrder: number;
    numericValue: number | null;
  }>;
  subjects: Array<{
    id: string;
    code: string;
    nameEn: string;
    nameNp: string | null;
    sortOrder: number;
  }>;
}

@Injectable()
export class BandConfigService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Returns every band row with its grade_scales and band_subjects.
   * Band-as-data — callers must not branch on grade numbers; they read
   * assessment_mode / aggregation_rule off each band.
   */
  async listBands(): Promise<BandConfigRow[]> {
    const client = this.supabase.getClient();
    if (!client) {
      throw new NotFoundException('Database is not configured');
    }
    const { data: bands, error: bandsError } = await client
      .from('bands')
      .select('id, code, name_en, name_np, assessment_mode, aggregation_rule, grade_range');
    if (bandsError || !bands?.length) {
      throw new NotFoundException('Band config not found');
    }

    const orderIndex = new Map<string, number>(
      BAND_ORDER.map((code, index) => [code, index]),
    );
    const sortedBands = [...bands].sort((a, b) => {
      const ai = orderIndex.get(a.code as string) ?? Number.MAX_SAFE_INTEGER;
      const bi = orderIndex.get(b.code as string) ?? Number.MAX_SAFE_INTEGER;
      if (ai !== bi) return ai - bi;
      return String(a.code).localeCompare(String(b.code));
    });

    const results: BandConfigRow[] = [];
    for (const band of sortedBands) {
      const { data: gradeScales } = await client
        .from('grade_scales')
        .select('id, code, label_en, label_np, sort_order, numeric_value')
        .eq('band_id', band.id)
        .order('sort_order', { ascending: true });
      const { data: bandSubjects } = await client
        .from('band_subjects')
        .select('sort_order, subjects(id, code, name_en, name_np)')
        .eq('band_id', band.id)
        .order('sort_order', { ascending: true });
      const subjects = (bandSubjects ?? []).flatMap((row) => {
        const subject = row.subjects as
          | { id: string; code: string; name_en: string; name_np: string | null }
          | { id: string; code: string; name_en: string; name_np: string | null }[]
          | null;
        if (!subject || Array.isArray(subject)) {
          return [];
        }
        return [
          {
            id: subject.id,
            code: subject.code,
            nameEn: subject.name_en,
            nameNp: subject.name_np,
            sortOrder: row.sort_order,
          },
        ];
      });
      results.push({
        id: band.id,
        code: band.code,
        nameEn: band.name_en,
        nameNp: band.name_np,
        assessmentMode: band.assessment_mode,
        aggregationRule: band.aggregation_rule,
        gradeRange: band.grade_range,
        gradeScales: (gradeScales ?? []).map((scale) => ({
          id: scale.id,
          code: scale.code,
          labelEn: scale.label_en,
          labelNp: scale.label_np,
          sortOrder: scale.sort_order,
          numericValue: scale.numeric_value,
        })),
        subjects,
      });
    }
    return results;
  }
}
