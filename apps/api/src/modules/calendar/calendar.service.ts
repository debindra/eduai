import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { bsYearForAdDate } from '@eduai/bs-date';
import { NationalCalendarService } from '../platform/national-calendar.service';
import { CalendarRepository } from './calendar.repository';
import type { CalendarSetupDto } from './dto/calendar-setup.dto';
import type { PatchFestivalTemplateDto } from './dto/calendar-response.dto';

@Injectable()
export class CalendarService {
  constructor(
    private readonly repository: CalendarRepository,
    private readonly nationalCalendar: NationalCalendarService,
  ) {}

  async setupCalendar(schoolId: string, dto: CalendarSetupDto) {
    const existingDraft = await this.repository.findDraftCalendar(schoolId);
    if (existingDraft) {
      throw new BadRequestException('A draft calendar already exists for this school');
    }
    const calendar = await this.repository.insertCalendar(schoolId, dto);
    await this.repository.insertTerminals(calendar.id, dto.terminals);
    // National closures apply via teaching_days VIEW — do not copy into calendar_closures.
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
    const bsYear = bsYearForAdDate(calendar.session_start);
    const [national, schoolClosures] = await Promise.all([
      this.nationalCalendar.listPublishedClosuresForBsYear(bsYear),
      this.repository.listSchoolClosures(calendar.id),
    ]);
    return {
      schoolCalendarId: calendar.id,
      bsYear,
      nationalClosures: national.map((c) => ({
        id: c.id,
        name: c.name,
        startDate: c.startDate,
        endDate: c.endDate,
        category: c.category,
        source: 'national' as const,
        readOnly: true as const,
      })),
      closures: schoolClosures.map((closure) => ({
        id: closure.id,
        name: closure.name,
        startDate: closure.start_date,
        endDate: closure.end_date,
        source: closure.source as 'festival_template' | 'manual' | 'local',
        readOnly: false as const,
      })),
    };
  }

  async patchFestivalTemplate(schoolId: string, dto: PatchFestivalTemplateDto) {
    const calendar = await this.requireDraftCalendar(schoolId);
    const updated = [];
    for (const closure of dto.closures) {
      const row = await this.repository.upsertLocalClosure(calendar.id, closure);
      updated.push({
        id: row.id,
        name: row.name,
        startDate: row.start_date,
        endDate: row.end_date,
        source: row.source as 'festival_template' | 'manual' | 'local',
        readOnly: false as const,
      });
    }
    const bsYear = bsYearForAdDate(calendar.session_start);
    const national = await this.nationalCalendar.listPublishedClosuresForBsYear(bsYear);
    return {
      schoolCalendarId: calendar.id,
      bsYear,
      nationalClosures: national.map((c) => ({
        id: c.id,
        name: c.name,
        startDate: c.startDate,
        endDate: c.endDate,
        category: c.category,
        source: 'national' as const,
        readOnly: true as const,
      })),
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

  /**
   * Shared calendar board payload: prefer approved, else draft.
   * National closures are read-only overlay; school closures are local/manual.
   */
  async getCalendarView(schoolId: string) {
    const approved = await this.repository.findApprovedCalendar(schoolId);
    const calendar = approved ?? (await this.repository.findDraftCalendar(schoolId));
    if (!calendar) {
      return {
        schoolId,
        approvalStatus: 'none' as const,
        nationalClosures: [],
        closures: [],
        terminals: [],
      };
    }
    const bsYear = bsYearForAdDate(calendar.session_start);
    const [national, schoolClosures, terminals] = await Promise.all([
      this.nationalCalendar.listPublishedClosuresForBsYear(bsYear),
      this.repository.listSchoolClosures(calendar.id),
      this.repository.listTerminals(calendar.id),
    ]);
    return {
      schoolId,
      schoolCalendarId: calendar.id,
      academicYearLabel: calendar.academic_year_label,
      approvalStatus: calendar.approval_status as 'draft' | 'approved',
      bsYear,
      sessionStart: calendar.session_start,
      sessionEnd: calendar.session_end,
      nationalClosures: national.map((c) => ({
        id: c.id,
        name: c.name,
        startDate: c.startDate,
        endDate: c.endDate,
        category: c.category,
        source: 'national' as const,
        readOnly: true as const,
      })),
      closures: schoolClosures.map((closure) => ({
        id: closure.id,
        name: closure.name,
        startDate: closure.start_date,
        endDate: closure.end_date,
        source: closure.source as 'festival_template' | 'manual' | 'local',
        readOnly: false as const,
      })),
      terminals: terminals.map((terminal) => ({
        id: terminal.id,
        name: terminal.name,
        startDate: terminal.start_date,
        endDate: terminal.end_date,
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
