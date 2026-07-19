import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Monthly plan auto-derived from yearly map' })
  @ApiOkResponse({ type: MonthlyPlanResponseDto })
  getMonthly(
    @Param('sectionId') sectionId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ): Promise<MonthlyPlanResponseDto> {
    return this.service.getMonthly(sectionId, Number(year), Number(month));
  }

  @Get(':sectionId/weekly')
  @RequireSectionReadScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({ summary: 'Weekly plan with Sunday-adjustable overrides' })
  @ApiOkResponse({ type: WeeklyPlanResponseDto })
  getWeekly(
    @Param('sectionId') sectionId: string,
    @Query('weekStart') weekStart?: string,
  ): Promise<WeeklyPlanResponseDto> {
    return this.service.getWeekly(sectionId, weekStart);
  }

  @Post(':sectionId/weekly/adjust')
  @RequireSectionSubjectScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({ summary: 'Teacher Sunday adjust for a day in the week' })
  @ApiOkResponse({ type: WeeklyPlanResponseDto })
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
  @ApiOperation({ summary: 'Daily cell pre-filled from weekly plan' })
  @ApiOkResponse({ type: DailyPlanResponseDto })
  getDaily(
    @Param('sectionId') sectionId: string,
    @Query('date') date: string,
  ): Promise<DailyPlanResponseDto> {
    return this.service.getDaily(sectionId, date);
  }
}
