import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';

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

  async listPrePrimaryBands(): Promise<BandConfigRow[]> {
    const client = this.supabase.getClient();
    if (!client) {
      throw new NotFoundException('Database is not configured');
    }
    const { data: bands, error: bandsError } = await client
      .from('bands')
      .select('id, code, name_en, name_np, assessment_mode, aggregation_rule, grade_range')
      .eq('code', 'pre_primary');
    if (bandsError || !bands?.length) {
      throw new NotFoundException('Pre-primary band config not found');
    }
    const results: BandConfigRow[] = [];
    for (const band of bands) {
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
