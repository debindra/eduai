import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { isBandLicensed } from './out-of-segment-logic';

export interface OutOfSegmentCounts {
  schoolId: string;
  total: number;
  byBand: Record<string, number>;
  byFeature: Record<string, number>;
}

@Injectable()
export class OutOfSegmentRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private client() {
    const c = this.supabase.getClient();
    if (!c) throw new Error('Supabase is not configured');
    return c;
  }

  async findSchoolLicence(schoolId: string): Promise<string | null> {
    const { data, error } = await this.client()
      .from('schools')
      .select('licensed_band_range')
      .eq('id', schoolId)
      .maybeSingle();
    if (error) throw error;
    return (data?.licensed_band_range as string | null) ?? null;
  }

  async findBandCode(bandId: string): Promise<string | null> {
    const { data, error } = await this.client()
      .from('bands')
      .select('code')
      .eq('id', bandId)
      .maybeSingle();
    if (error) throw error;
    return (data?.code as string | null) ?? null;
  }

  async insertLog(row: { school_id: string; requested_feature: string; requested_band: string }) {
    const { error } = await this.client().from('out_of_segment_query_log').insert(row);
    if (error) throw error;
  }

  async listBySchool(schoolId: string) {
    const { data, error } = await this.client()
      .from('out_of_segment_query_log')
      .select('requested_feature, requested_band')
      .eq('school_id', schoolId);
    if (error) throw error;
    return data ?? [];
  }
}

@Injectable()
export class OutOfSegmentService {
  constructor(private readonly repository: OutOfSegmentRepository) {}

  /**
   * Log a demand signal when a school requests a feature for a band outside its
   * licence. No-op when the band is licensed or cannot be resolved.
   */
  async logIfOutOfSegment(schoolId: string, featureId: string, bandId: string): Promise<boolean> {
    const [licence, bandCode] = await Promise.all([
      this.repository.findSchoolLicence(schoolId),
      this.repository.findBandCode(bandId),
    ]);
    if (!bandCode) return false;
    if (isBandLicensed(bandCode, licence)) return false;
    await this.repository.insertLog({
      school_id: schoolId,
      requested_feature: featureId,
      requested_band: bandCode,
    });
    return true;
  }

  /** Admin gravity: counts/shapes only — never child names or ratings. */
  async adminCounts(schoolId: string): Promise<OutOfSegmentCounts> {
    const rows = await this.repository.listBySchool(schoolId);
    const byBand: Record<string, number> = {};
    const byFeature: Record<string, number> = {};
    for (const row of rows) {
      const band = row.requested_band as string;
      const feature = row.requested_feature as string;
      byBand[band] = (byBand[band] ?? 0) + 1;
      byFeature[feature] = (byFeature[feature] ?? 0) + 1;
    }
    return { schoolId, total: rows.length, byBand, byFeature };
  }
}
