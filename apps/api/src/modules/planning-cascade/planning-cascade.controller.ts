import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import type { Request } from 'express';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { RequireSectionSubjectScope } from '../rbac/decorators/require-section-subject-scope.decorator';
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
  @RequireSectionSubjectScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({ summary: 'Monthly plan auto-derived from yearly map' })
  getMonthly(
    @Param('sectionId') sectionId: string,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.service.getMonthly(sectionId, Number(year), Number(month));
  }

  @Get(':sectionId/weekly')
  @RequireSectionSubjectScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({ summary: 'Weekly plan with Sunday-adjustable overrides' })
  getWeekly(
    @Param('sectionId') sectionId: string,
    @Query('weekStart') weekStart?: string,
  ) {
    return this.service.getWeekly(sectionId, weekStart);
  }

  @Post(':sectionId/weekly/adjust')
  @RequireSectionSubjectScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({ summary: 'Teacher Sunday adjust for a day in the week' })
  adjust(
    @Param('sectionId') sectionId: string,
    @Body() dto: AdjustWeeklyDto,
    @Req() req: Request,
  ) {
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
  @RequireSectionSubjectScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({ summary: 'Daily cell pre-filled from weekly plan' })
  getDaily(
    @Param('sectionId') sectionId: string,
    @Query('date') date: string,
  ) {
    return this.service.getDaily(sectionId, date);
  }
}
