import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import type { Request } from 'express';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import {
  RequireSectionReadScope,
  RequireSectionSubjectScope,
} from '../rbac/decorators/require-section-subject-scope.decorator';
import {
  DailyPlanResponseDto,
  MonthlyPlanResponseDto,
  WeeklyPlanResponseDto,
} from './dto/planning-response.dto';
import { PlanningCascadeService } from './planning-cascade.service';

class AdjustWeeklyDto {
  @ApiProperty()
  @IsString()
  dayDate!: string;

  @ApiProperty()
  @IsString()
  themeOrChapter!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

@ApiTags('planning')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('planning')
export class PlanningCascadeController {
  constructor(private readonly service: PlanningCascadeService) {}

  @Get(':sectionId/monthly')
  @RequireSectionReadScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({
    summary: 'Monthly plan auto-derived from yearly map',
    description: `Returns monthly teaching plan by aggregating map_slices for the specified BS month.

Invariant #6: Teaching days are derived — plan reflows automatically when calendar changes.

Requires: SectionReadScope (teacher has read access to this section).`,
  })
  @ApiOkResponse({ type: MonthlyPlanResponseDto, description: 'Monthly plan retrieved successfully' })
  @ApiBadRequestResponse({ description: 'Invalid year/month format' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section' })
  getMonthly(
    @Param('sectionId') sectionId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ): Promise<MonthlyPlanResponseDto> {
    return this.service.getMonthly(sectionId, Number(year), Number(month));
  }

  @Get(':sectionId/weekly')
  @RequireSectionReadScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({
    summary: 'Weekly plan with Sunday-adjustable overrides',
    description: `Returns weekly plan derived from monthly plan, with teacher's Sunday adjustments overlaid.

Teachers can adjust individual days via POST /adjust — this view reflects those overrides.

Requires: SectionReadScope (teacher has read access to this section).`,
  })
  @ApiOkResponse({ type: WeeklyPlanResponseDto, description: 'Weekly plan retrieved successfully' })
  @ApiBadRequestResponse({ description: 'Invalid weekStart date format' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section' })
  getWeekly(
    @Param('sectionId') sectionId: string,
    @Query('weekStart') weekStart?: string,
  ): Promise<WeeklyPlanResponseDto> {
    return this.service.getWeekly(sectionId, weekStart);
  }

  @Post(':sectionId/weekly/adjust')
  @RequireSectionSubjectScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({
    summary: 'Teacher Sunday adjust for a day in the week',
    description: `Allows teacher to override auto-generated daily plan for a specific day (typically done on Sunday).

Creates or updates weekly_plan_overrides row for the specified day.

Requires: SectionSubjectWriteGuard (teacher for this section).`,
  })
  @ApiOkResponse({ type: WeeklyPlanResponseDto, description: 'Weekly plan adjusted successfully' })
  @ApiBadRequestResponse({ description: 'Invalid date format or validation failed' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section' })
  adjust(
    @Param('sectionId') sectionId: string,
    @Body() dto: AdjustWeeklyDto,
    @Req() req: Request,
  ): Promise<WeeklyPlanResponseDto> {
    const teacherId =
      req.user?.memberships.find((m) => m.teacherId)?.teacherId ?? null;
    return this.service.adjustWeeklyDay(
      sectionId,
      dto.dayDate,
      dto.themeOrChapter,
      teacherId,
      dto.notes,
    );
  }

  @Get(':sectionId/daily')
  @RequireSectionReadScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({
    summary: 'Daily cell pre-filled from weekly plan',
    description: `Returns daily teaching plan pre-filled from weekly plan (with any Sunday adjustments applied).

Used as context for lesson generation and "mark done" tracking.

Requires: SectionReadScope (teacher has read access to this section).`,
  })
  @ApiOkResponse({ type: DailyPlanResponseDto, description: 'Daily plan retrieved successfully' })
  @ApiBadRequestResponse({ description: 'Invalid date format' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section' })
  getDaily(
    @Param('sectionId') sectionId: string,
    @Query('date') date: string,
  ): Promise<DailyPlanResponseDto> {
    return this.service.getDaily(sectionId, date);
  }
}
