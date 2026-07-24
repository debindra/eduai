import { Injectable, Logger } from '@nestjs/common';
import { Axiom } from '@axiomhq/js';

/**
 * Structured logging service using Axiom
 * Logs AI interactions, RLS violations, mapper guard rejections, etc.
 * Falls back to console logging when AXIOM_TOKEN is not configured
 */
@Injectable()
export class AxiomLoggerService {
  private readonly logger = new Logger(AxiomLoggerService.name);
  private axiom: Axiom | null = null;
  private readonly dataset: string;

  constructor() {
    const token = process.env.AXIOM_TOKEN;
    const dataset = process.env.AXIOM_DATASET || 'eduai-logs';
    this.dataset = dataset;

    if (token) {
      try {
        this.axiom = new Axiom({
          token,
          orgId: process.env.AXIOM_ORG_ID,
        });
        this.logger.log(`Axiom logging initialized (dataset: ${dataset})`);
      } catch (error) {
        this.logger.warn('Failed to initialize Axiom:', error);
      }
    } else {
      this.logger.log('AXIOM_TOKEN not set — using console logging');
    }
  }

  /**
   * Log AI interaction (prompt, tokens, latency, cache hit)
   */
  async logAiInteraction(data: {
    feature: string;
    bandId: string;
    promptTokens: number;
    completionTokens: number;
    latencyMs: number;
    cacheHit: boolean;
    model?: string;
    teacherId?: string;
  }): Promise<void> {
    const event = {
      _time: new Date().toISOString(),
      type: 'ai_interaction',
      ...data,
    };

    if (this.axiom) {
      try {
        await this.axiom.ingest(this.dataset, [event]);
      } catch (error) {
        this.logger.error('Failed to log AI interaction to Axiom:', error);
      }
    } else {
      this.logger.debug('[AI Interaction]', event);
    }
  }

  /**
   * Log mapper guard rejection (ambiguous name, instant top rating, etc.)
   */
  async logMapperGuardRejection(data: {
    guardType: string;
    reason: string;
    input: unknown;
    sectionId?: string;
    teacherId?: string;
  }): Promise<void> {
    const event = {
      _time: new Date().toISOString(),
      type: 'mapper_guard_rejection',
      severity: 'warning',
      ...data,
    };

    if (this.axiom) {
      try {
        await this.axiom.ingest(this.dataset, [event]);
      } catch (error) {
        this.logger.error('Failed to log mapper guard rejection to Axiom:', error);
      }
    } else {
      this.logger.warn('[Mapper Guard Rejection]', event);
    }
  }

  /**
   * Log RLS policy violation (attempted cross-section data access)
   */
  async logRlsViolation(data: {
    userId: string;
    table: string;
    attemptedAction: string;
    sectionId?: string;
    deniedReason?: string;
  }): Promise<void> {
    const event = {
      _time: new Date().toISOString(),
      type: 'rls_violation',
      severity: 'high',
      ...data,
    };

    if (this.axiom) {
      try {
        await this.axiom.ingest(this.dataset, [event]);
      } catch (error) {
        this.logger.error('Failed to log RLS violation to Axiom:', error);
      }
    } else {
      this.logger.error('[RLS Violation]', event);
    }
  }

  /**
   * Log calendar reflow event (teaching days recalculated)
   */
  async logCalendarReflow(data: {
    schoolId: string;
    calendarId: string;
    changeType: 'closure_added' | 'closure_removed' | 'weekly_offs_changed';
    affectedSections: number;
    reflowDurationMs: number;
  }): Promise<void> {
    const event = {
      _time: new Date().toISOString(),
      type: 'calendar_reflow',
      ...data,
    };

    if (this.axiom) {
      try {
        await this.axiom.ingest(this.dataset, [event]);
      } catch (error) {
        this.logger.error('Failed to log calendar reflow to Axiom:', error);
      }
    } else {
      this.logger.log('[Calendar Reflow]', event);
    }
  }

  /**
   * Log safeguarding signal detection
   */
  async logSafeguardingSignal(data: {
    severity: 'low' | 'medium' | 'high' | 'critical';
    keywords: string[];
    context: string;
    teacherId: string;
    sectionId: string;
    childId?: string;
    notificationsSent: string[];
  }): Promise<void> {
    const event = {
      _time: new Date().toISOString(),
      type: 'safeguarding_signal',
      ...data,
    };

    if (this.axiom) {
      try {
        await this.axiom.ingest(this.dataset, [event]);
      } catch (error) {
        this.logger.error('Failed to log safeguarding signal to Axiom:', error);
      }
    } else {
      this.logger.error('[Safeguarding Signal]', event);
    }
  }

  /**
   * Log custom event with arbitrary data
   */
  async log(type: string, data: Record<string, unknown>): Promise<void> {
    const event = {
      _time: new Date().toISOString(),
      type,
      ...data,
    };

    if (this.axiom) {
      try {
        await this.axiom.ingest(this.dataset, [event]);
      } catch (error) {
        this.logger.error(`Failed to log ${type} to Axiom:`, error);
      }
    } else {
      this.logger.log(`[${type}]`, event);
    }
  }
}
