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
      clonedFromApproved: false as const,
      hasLiveApproved: Boolean(await this.repository.findApprovedCalendar(schoolId)),
    };
  }

  /**
   * Resume existing draft, or clone the live approved calendar into a new draft
   * so platform/admin can edit without changing what teachers see until approve.
   */
  async ensureEditableDraft(schoolId: string) {
    const existingDraft = await this.repository.findDraftCalendar(schoolId);
    if (existingDraft) {
      const approved = await this.repository.findApprovedCalendar(schoolId);
      return {
        schoolCalendarId: existingDraft.id,
        academicYearLabel: existingDraft.academic_year_label,
        approvalStatus: 'draft' as const,
        clonedFromApproved: false as const,
        hasLiveApproved: Boolean(approved),
      };
    }

    const approved = await this.repository.findApprovedCalendar(schoolId);
    if (!approved) {
      throw new NotFoundException(
        'No approved calendar to edit — create a draft with setup first',
      );
    }

    const terminals = await this.repository.listTerminals(approved.id);
    const terminalDtos = terminals.map((terminal, index) => ({
      name: terminal.name,
      sortOrder: terminal.sort_order ?? index + 1,
      startDate: terminal.start_date,
      endDate: terminal.end_date,
      reportingType: terminal.reporting_type as
        | 'formative'
        | 'summative'
        | 'transition',
    }));
    const draft = await this.repository.insertCalendar(schoolId, {
      academicYearLabel: approved.academic_year_label,
      sessionStart: approved.session_start,
      sessionEnd: approved.session_end,
      weeklyOffs: approved.weekly_offs ?? [6],
      terminals: terminalDtos,
    });
    await this.repository.insertTerminals(draft.id, terminalDtos);
    await this.repository.copyClosures(approved.id, draft.id);

    return {
      schoolCalendarId: draft.id,
      academicYearLabel: draft.academic_year_label,
      approvalStatus: 'draft' as const,
      clonedFromApproved: true as const,
      hasLiveApproved: true as const,
    };
  }

  /** Update session / weekly offs / terminals on the current draft only. */
  async updateDraftSetup(schoolId: string, dto: CalendarSetupDto) {
    const calendar = await this.requireDraftCalendar(schoolId);
    const updated = await this.repository.updateDraftCalendar(calendar.id, dto);
    await this.repository.deleteTerminalsForCalendar(calendar.id);
    await this.repository.insertTerminals(calendar.id, dto.terminals);
    const approved = await this.repository.findApprovedCalendar(schoolId);
    return {
      schoolCalendarId: updated.id,
      academicYearLabel: updated.academic_year_label,
      approvalStatus: 'draft' as const,
      clonedFromApproved: false as const,
      hasLiveApproved: Boolean(approved),
    };
  }

  async getCalendarStatus(schoolId: string) {
    const draft = await this.repository.findDraftCalendar(schoolId);
    const approved = await this.repository.findApprovedCalendar(schoolId);
    if (draft) {
      return {
        approvalStatus: 'draft' as const,
        schoolCalendarId: draft.id,
        academicYearLabel: draft.academic_year_label,
        hasLiveApproved: Boolean(approved),
      };
    }
    if (approved) {
      return {
        approvalStatus: 'approved' as const,
        schoolCalendarId: approved.id,
        academicYearLabel: approved.academic_year_label,
        hasLiveApproved: true as const,
      };
    }
    return { approvalStatus: 'none' as const, hasLiveApproved: false as const };
  }

  async getFestivalTemplate(schoolId: string) {
    // Prefer draft for editing; fall back to approved for view-only access.
    const draft = await this.repository.findDraftCalendar(schoolId);
    const calendar = draft ?? (await this.repository.findApprovedCalendar(schoolId));
    if (!calendar) {
      throw new NotFoundException('Calendar not found for this school');
    }
    const approvalStatus = calendar.approval_status as 'draft' | 'approved';
    const closuresReadOnly = approvalStatus === 'approved';
    const bsYear = bsYearForAdDate(calendar.session_start);
    const [national, schoolClosures] = await Promise.all([
      this.nationalCalendar.listPublishedClosuresForBsYear(bsYear),
      this.repository.listSchoolClosures(calendar.id),
    ]);
    return {
      schoolCalendarId: calendar.id,
      academicYearLabel: calendar.academic_year_label,
      approvalStatus,
      bsYear,
      sessionStart: calendar.session_start,
      sessionEnd: calendar.session_end,
      weeklyOffs: calendar.weekly_offs ?? [],
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
        category: closure.category as 'school_holiday' | 'eca' | 'cca',
        readOnly: closuresReadOnly,
      })),
    };
  }

  async patchFestivalTemplate(schoolId: string, dto: PatchFestivalTemplateDto) {
    const calendar = await this.requireDraftCalendar(schoolId);
    const existing = await this.repository.listSchoolClosures(calendar.id);
    const keptIds = new Set(
      dto.closures.map((c) => c.id).filter((id): id is string => Boolean(id)),
    );
    for (const row of existing) {
      if (!keptIds.has(row.id)) {
        await this.repository.deleteLocalClosure(calendar.id, row.id);
      }
    }
    const updated = [];
    for (const closure of dto.closures) {
      const row = await this.repository.upsertLocalClosure(calendar.id, closure);
      updated.push({
        id: row.id,
        name: row.name,
        startDate: row.start_date,
        endDate: row.end_date,
        source: row.source as 'festival_template' | 'manual' | 'local',
        category: row.category as 'school_holiday' | 'eca' | 'cca',
        readOnly: false as const,
      });
    }
    const bsYear = bsYearForAdDate(calendar.session_start);
    const national = await this.nationalCalendar.listPublishedClosuresForBsYear(bsYear);
    return {
      schoolCalendarId: calendar.id,
      approvalStatus: 'draft' as const,
      bsYear,
      sessionStart: calendar.session_start,
      sessionEnd: calendar.session_end,
      weeklyOffs: calendar.weekly_offs ?? [],
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
    await this.repository.supersedeApprovedForSchoolYear(
      schoolId,
      calendar.academic_year_label,
    );
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

  /**
   * National weekly-off preset for school setup UI.
   * School/tenant admin may change weekly offs when creating/editing the school calendar.
   */
  async getWeeklyOffPreset(bsYear: number) {
    const national = await this.nationalCalendar.getPublishedWeeklyOffs(bsYear);
    return {
      bsYear,
      weeklyOffs: national ?? [6],
      fromNational: national !== null,
    };
  }

  async getTeachingDays(schoolId: string) {
    const calendar = await this.repository.findApprovedCalendar(schoolId);
    if (!calendar) {
      throw new NotFoundException('No approved calendar configured for this school');
    }
    const [terminals, teachingDays] = await Promise.all([
      this.repository.listTerminals(calendar.id),
      this.repository.listTeachingDays(schoolId),
    ]);
    const counts = new Map<string, number>();
    for (const day of teachingDays) {
      if (day.school_calendar_id !== calendar.id) continue;
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
      weeklyOffs: calendar.weekly_offs ?? [],
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
        category: closure.category as 'school_holiday' | 'eca' | 'cca',
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
