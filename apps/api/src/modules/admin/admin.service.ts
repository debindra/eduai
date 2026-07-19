import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import { CacheMetricsService } from '../ai-orchestration/cache-metrics.service';
import { OutOfSegmentService } from '../out-of-segment/out-of-segment.service';
import { OutcomesService } from '../outcomes/outcomes.service';
import { PacingService } from '../pacing/pacing.service';

export interface AdminDashboardResponse {
  schoolId: string;
  periodStart: string;
  periodEnd: string;
  coverageBySection: Array<{ sectionId: string; sectionName: string; childrenWithFreshOutcomes: number }>;
  sectionsBehindCount: number;
  sectionsTotal: number;
  communicationReplyWithinDayRate: number | null;
  needsSupportBySection: Array<{ sectionId: string; sectionName: string; stalledCount: number }>;
}

/**
 * Exclusive upper bound for an inclusive date-only period end. `confirmed_at` is
 * a timestamptz; comparing it `<= 'YYYY-MM-DD'` coerces the bound to midnight and
 * silently drops every row confirmed during the final day. Use `< (periodEnd + 1
 * day)` so the whole last day is counted.
 */
export function exclusivePeriodEnd(periodEnd: string): string {
  const dateOnly = periodEnd.slice(0, 10);
  const d = new Date(`${dateOnly}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

@Injectable()
export class AdminRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private client() {
    const c = this.supabase.getClient();
    if (!c) throw new Error('Supabase is not configured');
    return c;
  }

  async listSections(schoolId: string) {
    const { data, error } = await this.client()
      .from('sections')
      .select('id, name')
      .eq('school_id', schoolId);
    if (error) throw error;
    return data ?? [];
  }

  async countChildrenWithFreshOutcomes(sectionId: string, periodStart: string, periodEnd: string) {
    const { data, error } = await this.client()
      .from('student_outcomes')
      .select('child_id')
      .eq('section_id', sectionId)
      .eq('state', 'confirmed')
      .gte('confirmed_at', periodStart)
      .lt('confirmed_at', exclusivePeriodEnd(periodEnd));
    if (error) throw error;
    const unique = new Set((data ?? []).map((r) => r.child_id as string));
    return unique.size;
  }

  async communicationReplyRate(schoolId: string, periodStart: string, periodEnd: string) {
    const { data: inbound, error: iErr } = await this.client()
      .from('message_log')
      .select('id, thread_id, created_at')
      .eq('school_id', schoolId)
      .eq('direction', 'inbound')
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd);
    if (iErr) throw iErr;
    const inboundRows = inbound ?? [];
    if (inboundRows.length === 0) return null;

    const { data: outbound, error: oErr } = await this.client()
      .from('message_log')
      .select('thread_id, created_at')
      .eq('school_id', schoolId)
      .eq('direction', 'outbound')
      .in('approval_status', ['approved', 'sent', 'auto']);
    if (oErr) throw oErr;
    const outboundByThread = new Map<string, string[]>();
    for (const row of outbound ?? []) {
      const tid = row.thread_id as string;
      const list = outboundByThread.get(tid) ?? [];
      list.push(row.created_at as string);
      outboundByThread.set(tid, list);
    }

    let withinDay = 0;
    for (const msg of inboundRows) {
      const replies = outboundByThread.get(msg.thread_id as string) ?? [];
      const inboundAt = new Date(msg.created_at as string).getTime();
      const replied = replies.some((ts) => {
        const delta = new Date(ts).getTime() - inboundAt;
        return delta >= 0 && delta <= 24 * 60 * 60 * 1000;
      });
      if (replied) withinDay += 1;
    }
    return withinDay / inboundRows.length;
  }
}

@Injectable()
export class AdminService {
  constructor(
    private readonly repository: AdminRepository,
    private readonly pacing: PacingService,
    private readonly outcomes: OutcomesService,
    private readonly cacheMetrics: CacheMetricsService,
    private readonly outOfSegment: OutOfSegmentService,
  ) {}

  /** Cache hit/miss counts (remedial-activity cache reported separately). */
  getCacheMetrics() {
    return this.cacheMetrics.snapshot();
  }

  /** Out-of-segment demand-signal counts (gravity: counts/shapes only). */
  getOutOfSegment(schoolId: string) {
    return this.outOfSegment.adminCounts(schoolId);
  }

  async getDashboard(schoolId: string, periodStart: string, periodEnd: string): Promise<AdminDashboardResponse> {
    const sections = await this.repository.listSections(schoolId);
    const coverageBySection: AdminDashboardResponse['coverageBySection'] = [];
    const needsSupportBySection: AdminDashboardResponse['needsSupportBySection'] = [];
    let sectionsBehindCount = 0;

    for (const section of sections) {
      const sectionId = section.id as string;
      const sectionName = (section.name as string) ?? sectionId;
      const childrenWithFreshOutcomes = await this.repository.countChildrenWithFreshOutcomes(
        sectionId,
        periodStart,
        periodEnd,
      );
      coverageBySection.push({ sectionId, sectionName, childrenWithFreshOutcomes });

      const pacing = await this.pacing.getPacing(sectionId);
      if (pacing.state === 'behind') {
        sectionsBehindCount += 1;
      }

      const stalled = await this.outcomes.listStalledMilestones(sectionId);
      needsSupportBySection.push({ sectionId, sectionName, stalledCount: stalled.stalledCount });
    }

    const communicationReplyWithinDayRate = await this.repository.communicationReplyRate(
      schoolId,
      periodStart,
      periodEnd,
    );

    return {
      schoolId,
      periodStart,
      periodEnd,
      coverageBySection,
      sectionsBehindCount,
      sectionsTotal: sections.length,
      communicationReplyWithinDayRate,
      needsSupportBySection,
    };
  }
}
