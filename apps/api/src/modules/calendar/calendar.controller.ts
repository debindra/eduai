import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { RequireRole } from '../auth/decorators/require-role.decorator';
import { RequireSchoolAdmin } from '../auth/decorators/require-school-admin.decorator';
import { RequireSchoolMember } from '../auth/decorators/require-school-member.decorator';
import { RequireRoleGuard } from '../auth/guards/require-role.guard';
import { RequireSchoolAdminGuard } from '../auth/guards/require-school-admin.guard';
import { RequireSchoolMemberGuard } from '../auth/guards/require-school-member.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import type { RequestUser } from '../auth/types/request-user.types';
import { CalendarService } from './calendar.service';
import { CalendarSetupDto } from './dto/calendar-setup.dto';
import {
  ApproveCalendarResponseDto,
  CalendarSetupResponseDto,
  CalendarStatusResponseDto,
  CalendarViewResponseDto,
  FestivalTemplateResponseDto,
  PatchFestivalTemplateDto,
  TeachingDaysResponseDto,
  WeeklyOffPresetResponseDto,
} from './dto/calendar-response.dto';

@ApiTags('calendar')
@ApiBearerAuth()
@Controller('calendar')
@UseGuards(SupabaseAuthGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get(':schoolId/view')
  @UseGuards(RequireSchoolMemberGuard)
  @RequireSchoolMember({ schoolIdParam: 'schoolId' })
  @ApiOperation({
    summary: 'Shared school calendar view (read-only)',
    description:
      'Admin, teacher (school membership), or platform with active support session. ' +
      'Returns national + local closures for the BS calendar board. Prefer approved calendar.',
  })
  @ApiOkResponse({ type: CalendarViewResponseDto })
  async getCalendarView(@Param('schoolId') schoolId: string): Promise<CalendarViewResponseDto> {
    return this.calendarService.getCalendarView(schoolId);
  }

  @Post(':schoolId/setup')
  @UseGuards(RequireRoleGuard, RequireSchoolAdminGuard)
  @RequireRole('admin')
  @RequireSchoolAdmin({ schoolIdParam: 'schoolId' })
  @ApiOperation({
    summary: 'Create a draft school calendar',
    description:
      'Requires active admin membership for the school. Creates session span, terminals, weekly offs, and a pre-filled festival-template closure set. Does not write curriculum content.',
  })
  @ApiOkResponse({ type: CalendarSetupResponseDto })
  @ApiBadRequestResponse({ description: 'Draft calendar already exists or invalid payload' })
  @ApiForbiddenResponse({ description: 'Requires admin role' })
  async setup(
    @Param('schoolId') schoolId: string,
    @Body() dto: CalendarSetupDto,
  ): Promise<CalendarSetupResponseDto> {
    return this.calendarService.setupCalendar(schoolId, dto);
  }

  @Patch(':schoolId/setup')
  @UseGuards(RequireRoleGuard, RequireSchoolAdminGuard)
  @RequireRole('admin')
  @RequireSchoolAdmin({ schoolIdParam: 'schoolId' })
  @ApiOperation({
    summary: 'Update draft calendar session / terminals',
    description:
      'Requires admin role. Updates the editable draft only — live approved calendars are unchanged until approve.',
  })
  @ApiOkResponse({ type: CalendarSetupResponseDto })
  @ApiNotFoundResponse({ description: 'Draft calendar not found' })
  async updateSetup(
    @Param('schoolId') schoolId: string,
    @Body() dto: CalendarSetupDto,
  ): Promise<CalendarSetupResponseDto> {
    return this.calendarService.updateDraftSetup(schoolId, dto);
  }

  @Post(':schoolId/ensure-draft')
  @UseGuards(RequireRoleGuard, RequireSchoolAdminGuard)
  @RequireRole('admin')
  @RequireSchoolAdmin({ schoolIdParam: 'schoolId' })
  @ApiOperation({
    summary: 'Ensure an editable draft calendar',
    description:
      'Returns the existing draft, or clones the live approved calendar into a new draft. ' +
      'Teachers keep seeing the approved copy until the draft is approved.',
  })
  @ApiOkResponse({ type: CalendarSetupResponseDto })
  @ApiNotFoundResponse({ description: 'No approved calendar to clone' })
  async ensureDraft(@Param('schoolId') schoolId: string): Promise<CalendarSetupResponseDto> {
    return this.calendarService.ensureEditableDraft(schoolId);
  }

  @Get(':schoolId/status')
  @UseGuards(RequireRoleGuard, RequireSchoolAdminGuard)
  @RequireRole('admin')
  @RequireSchoolAdmin({ schoolIdParam: 'schoolId' })
  @ApiOperation({
    summary: 'Get calendar wizard status',
    description:
      'Requires admin role. Returns draft when one exists (even if an approved calendar is live), otherwise approved, otherwise none.',
  })
  @ApiOkResponse({ type: CalendarStatusResponseDto })
  async getCalendarStatus(
    @Param('schoolId') schoolId: string,
  ): Promise<CalendarStatusResponseDto> {
    return this.calendarService.getCalendarStatus(schoolId);
  }

  @Get(':schoolId/festival-template')
  @UseGuards(RequireRoleGuard, RequireSchoolAdminGuard)
  @RequireRole('admin')
  @RequireSchoolAdmin({ schoolIdParam: 'schoolId' })
  @ApiOperation({
    summary: 'Get festival-template closures for review',
    description: 'Requires admin role. Reads draft calendar closures with source=festival_template.',
  })
  @ApiOkResponse({ type: FestivalTemplateResponseDto })
  @ApiNotFoundResponse({ description: 'Draft calendar not found' })
  async getFestivalTemplate(
    @Param('schoolId') schoolId: string,
  ): Promise<FestivalTemplateResponseDto> {
    return this.calendarService.getFestivalTemplate(schoolId);
  }

  @Patch(':schoolId/festival-template')
  @UseGuards(RequireRoleGuard, RequireSchoolAdminGuard)
  @RequireRole('admin')
  @RequireSchoolAdmin({ schoolIdParam: 'schoolId' })
  @ApiOperation({
    summary: 'Edit festival-template closures',
    description: 'Requires admin role. Upserts festival_template closures on the draft calendar.',
  })
  @ApiOkResponse({ type: FestivalTemplateResponseDto })
  async patchFestivalTemplate(
    @Param('schoolId') schoolId: string,
    @Body() dto: PatchFestivalTemplateDto,
  ): Promise<FestivalTemplateResponseDto> {
    return this.calendarService.patchFestivalTemplate(schoolId, dto);
  }

  @Post(':schoolId/approve')
  @UseGuards(RequireRoleGuard, RequireSchoolAdminGuard)
  @RequireRole('admin')
  @RequireSchoolAdmin({ schoolIdParam: 'schoolId' })
  @ApiOperation({
    summary: 'Approve the draft calendar',
    description:
      'Requires admin role. Promotes the draft to approved and supersedes any previous approved calendar for the same academic year. Teachers and teaching_days then read the new approved copy.',
  })
  @ApiOkResponse({ type: ApproveCalendarResponseDto })
  @ApiNotFoundResponse({ description: 'Draft calendar not found' })
  async approve(
    @Param('schoolId') schoolId: string,
    @Req() request: Request,
  ): Promise<ApproveCalendarResponseDto> {
    const user = request.user as RequestUser;
    return this.calendarService.approveCalendar(schoolId, user.identityId);
  }

  @Get(':schoolId/weekly-off-preset')
  @UseGuards(RequireSchoolMemberGuard)
  @RequireSchoolMember({ schoolIdParam: 'schoolId' })
  @ApiOperation({
    summary: 'National weekly day-off preset for school calendar setup',
    description:
      'Returns published national weekly offs for the BS year (default Saturday). ' +
      'School admins may override when configuring school_calendars.weekly_offs.',
  })
  @ApiOkResponse({ type: WeeklyOffPresetResponseDto })
  async getWeeklyOffPreset(
    @Param('schoolId') _schoolId: string,
    @Query('bsYear', ParseIntPipe) bsYear: number,
  ): Promise<WeeklyOffPresetResponseDto> {
    return this.calendarService.getWeeklyOffPreset(bsYear);
  }

  @Get(':schoolId/teaching-days')
  @UseGuards(RequireRoleGuard, RequireSchoolAdminGuard)
  @RequireRole('admin')
  @RequireSchoolAdmin({ schoolIdParam: 'schoolId' })
  @ApiOperation({
    summary: 'Read teaching-day counts per terminal',
    description:
      'Requires admin role. Reads the teaching_days VIEW (derived on read — never a stored count).',
  })
  @ApiOkResponse({ type: TeachingDaysResponseDto })
  @ApiNotFoundResponse({ description: 'Calendar not configured' })
  async getTeachingDays(@Param('schoolId') schoolId: string): Promise<TeachingDaysResponseDto> {
    return this.calendarService.getTeachingDays(schoolId);
  }
}
