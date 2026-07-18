import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CalendarRepository } from './calendar.repository';
import type { CalendarSetupDto } from './dto/calendar-setup.dto';
import type { PatchFestivalTemplateDto } from './dto/calendar-response.dto';

const DEFAULT_FESTIVAL_TEMPLATE = [
  { name: 'Dashain (template — adjust dates)', startDate: '2025-10-01', endDate: '2025-10-10' },
  { name: 'Tihar (template — adjust dates)', startDate: '2025-10-20', endDate: '2025-10-24' },
];

@Injectable()
export class CalendarService {
  constructor(private readonly repository: CalendarRepository) {}

  async setupCalendar(schoolId: string, dto: CalendarSetupDto) {
    const existingDraft = await this.repository.findDraftCalendar(schoolId);
    if (existingDraft) {
      throw new BadRequestException('A draft calendar already exists for this school');
    }
    const calendar = await this.repository.insertCalendar(schoolId, dto);
    await this.repository.insertTerminals(calendar.id, dto.terminals);
    await this.repository.insertFestivalClosures(calendar.id, DEFAULT_FESTIVAL_TEMPLATE);
    return {
      schoolCalendarId: calendar.id,
      academicYearLabel: calendar.academic_year_label,
      approvalStatus: 'draft' as const,
    };
  }

  async getCalendarStatus(schoolId: string) {
    const draft = await this.repository.findDraftCalendar(schoolId);
    if (draft) {
      return {
        approvalStatus: 'draft' as const,
        schoolCalendarId: draft.id,
        academicYearLabel: draft.academic_year_label,
      };
    }
    const latest = await this.repository.findLatestCalendar(schoolId);
    if (latest) {
      return {
        approvalStatus: latest.approval_status as 'approved',
        schoolCalendarId: latest.id,
        academicYearLabel: latest.academic_year_label,
      };
    }
    return { approvalStatus: 'none' as const };
  }

  async getFestivalTemplate(schoolId: string) {
    const calendar = await this.requireDraftCalendar(schoolId);
    const closures = await this.repository.listFestivalClosures(calendar.id);
    return {
      schoolCalendarId: calendar.id,
      closures: closures.map((closure) => ({
        id: closure.id,
        name: closure.name,
        startDate: closure.start_date,
        endDate: closure.end_date,
        source: 'festival_template' as const,
      })),
    };
  }

  async patchFestivalTemplate(schoolId: string, dto: PatchFestivalTemplateDto) {
    const calendar = await this.requireDraftCalendar(schoolId);
    const updated = [];
    for (const closure of dto.closures) {
      const row = await this.repository.upsertFestivalClosure(calendar.id, closure);
      updated.push({
        id: row.id,
        name: row.name,
        startDate: row.start_date,
        endDate: row.end_date,
        source: 'festival_template' as const,
      });
    }
    return {
      schoolCalendarId: calendar.id,
      closures: updated,
    };
  }

  async approveCalendar(schoolId: string, approvedBy: string) {
    const calendar = await this.requireDraftCalendar(schoolId);
    const approved = await this.repository.approveCalendar(calendar.id, approvedBy);
    if (!approved.approved_at) {
      throw new BadRequestException('Approval timestamp missing');
    }
    return {
      schoolCalendarId: approved.id,
      approvalStatus: 'approved' as const,
      approvedAt: approved.approved_at,
    };
  }

  async getTeachingDays(schoolId: string) {
    const calendar = await this.repository.findLatestCalendar(schoolId);
    if (!calendar) {
      throw new NotFoundException('No calendar configured for this school');
    }
    const [terminals, teachingDays] = await Promise.all([
      this.repository.listTerminals(calendar.id),
      this.repository.listTeachingDays(schoolId),
    ]);
    const counts = new Map<string, number>();
    for (const day of teachingDays) {
      counts.set(day.terminal_id, (counts.get(day.terminal_id) ?? 0) + 1);
    }
    return {
      schoolId,
      terminals: terminals.map((terminal) => ({
        terminalId: terminal.id,
        terminalName: terminal.name,
        teachingDayCount: counts.get(terminal.id) ?? 0,
      })),
    };
  }

  private async requireDraftCalendar(schoolId: string) {
    const calendar = await this.repository.findDraftCalendar(schoolId);
    if (!calendar) {
      throw new NotFoundException('Draft calendar not found for this school');
    }
    return calendar;
  }
}
