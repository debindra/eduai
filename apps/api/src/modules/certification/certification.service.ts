import { BadRequestException, Injectable } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';
import {
  buildWeekView,
  computeCertificationStatus,
  isValidWeek,
  scoreQuiz,
  weekStatusFromScore,
  type CertificationStatus,
  type ObservationStatus,
  type WeekProgress,
} from './certification-logic';

export interface CertificationView {
  teacherId: string;
  status: CertificationStatus;
  weeks: WeekProgress[];
  observation: { status: ObservationStatus; score: number | null };
}

@Injectable()
export class CertificationRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private client() {
    const c = this.supabase.getClient();
    if (!c) throw new Error('Supabase is not configured');
    return c;
  }

  async listWeeks(teacherId: string): Promise<WeekProgress[]> {
    const { data, error } = await this.client()
      .from('certification_progress')
      .select('week, status, quiz_score')
      .eq('teacher_id', teacherId)
      .order('week', { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      week: row.week as number,
      status: row.status as WeekProgress['status'],
      quizScore: (row.quiz_score as number | null) ?? null,
    }));
  }

  async upsertWeek(teacherId: string, week: number, status: string, quizScore: number) {
    const { error } = await this.client()
      .from('certification_progress')
      .upsert(
        { teacher_id: teacherId, week, status, quiz_score: quizScore, updated_at: new Date().toISOString() },
        { onConflict: 'teacher_id,week' },
      );
    if (error) throw error;
  }

  async getObservation(teacherId: string) {
    const { data, error } = await this.client()
      .from('certification_observations')
      .select('status, score')
      .eq('teacher_id', teacherId)
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  async upsertObservation(teacherId: string, patch: {
    status: string;
    score: number | null;
    scored_by: string | null;
    scored_at: string | null;
  }) {
    const { error } = await this.client()
      .from('certification_observations')
      .upsert({ teacher_id: teacherId, ...patch }, { onConflict: 'teacher_id' });
    if (error) throw error;
  }

  async updateTeacherStatus(teacherId: string, status: CertificationStatus) {
    const { error } = await this.client()
      .from('teachers')
      .update({ certification_status: status })
      .eq('id', teacherId);
    if (error) throw error;
  }
}

@Injectable()
export class CertificationService {
  constructor(private readonly repository: CertificationRepository) {}

  async getProgress(teacherId: string): Promise<CertificationView> {
    const weeks = await this.repository.listWeeks(teacherId);
    const observationRow = await this.repository.getObservation(teacherId);
    const observation = {
      status: (observationRow?.status as ObservationStatus | undefined) ?? 'pending',
      score: (observationRow?.score as number | null | undefined) ?? null,
    };
    return {
      teacherId,
      status: computeCertificationStatus(weeks, observation.status),
      weeks: buildWeekView(weeks),
      observation,
    };
  }

  /** Deterministic weekly quiz — never routes through AI. */
  async submitWeeklyQuiz(teacherId: string, week: number, correct: number, total: number) {
    if (!isValidWeek(week)) {
      throw new BadRequestException(`Week must be 1–12 (got ${week})`);
    }
    if (total <= 0) {
      throw new BadRequestException('Quiz must have at least one question');
    }
    const score = scoreQuiz(correct, total);
    const status = weekStatusFromScore(score);
    await this.repository.upsertWeek(teacherId, week, status, score);
    return this.refreshAndReturn(teacherId);
  }

  /** Human-scored observation — caller must be an elevated (assessor/admin) role. */
  async scoreObservation(
    teacherId: string,
    passed: boolean,
    score: number | null,
    scoredByIdentityId: string | null,
  ) {
    await this.repository.upsertObservation(teacherId, {
      status: passed ? 'passed' : 'failed',
      score,
      scored_by: scoredByIdentityId,
      scored_at: new Date().toISOString(),
    });
    return this.refreshAndReturn(teacherId);
  }

  private async refreshAndReturn(teacherId: string): Promise<CertificationView> {
    const view = await this.getProgress(teacherId);
    await this.repository.updateTeacherStatus(teacherId, view.status);
    return view;
  }
}
