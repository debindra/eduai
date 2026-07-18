import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
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
import { RequireRoleGuard } from '../auth/guards/require-role.guard';
import { RequireSchoolAdminGuard } from '../auth/guards/require-school-admin.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import type { RequestUser } from '../auth/types/request-user.types';
import { CalendarService } from './calendar.service';
import { CalendarSetupDto } from './dto/calendar-setup.dto';
import {
  ApproveCalendarResponseDto,
  CalendarSetupResponseDto,
  CalendarStatusResponseDto,
  FestivalTemplateResponseDto,
  PatchFestivalTemplateDto,
  TeachingDaysResponseDto,
} from './dto/calendar-response.dto';

@ApiTags('calendar')
@ApiBearerAuth()
@Controller('calendar')
@UseGuards(SupabaseAuthGuard, RequireRoleGuard, RequireSchoolAdminGuard)
@RequireRole('admin')
@RequireSchoolAdmin({ schoolIdParam: 'schoolId' })
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post(':schoolId/setup')
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

  @Get(':schoolId/status')
  @ApiOperation({
    summary: 'Get calendar wizard status',
    description:
      'Requires admin role. Returns draft calendar when one exists, otherwise the latest approved calendar, otherwise none.',
  })
  @ApiOkResponse({ type: CalendarStatusResponseDto })
  async getCalendarStatus(
    @Param('schoolId') schoolId: string,
  ): Promise<CalendarStatusResponseDto> {
    return this.calendarService.getCalendarStatus(schoolId);
  }

  @Get(':schoolId/festival-template')
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
  @ApiOperation({
    summary: 'Approve the draft calendar',
    description:
      'Requires admin role. One approval action that unlocks downstream pacing/reporting triggers. Terminals remain coverage boundaries only — never exam dates.',
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

  @Get(':schoolId/teaching-days')
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
