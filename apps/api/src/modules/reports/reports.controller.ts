import { Body, Controller, ForbiddenException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import type { Request } from 'express';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { BlocksSubstituteConfirmation, RequireSectionSubjectScope } from '../rbac/decorators/require-section-subject-scope.decorator';
import { ReportsService } from './reports.service';

class DraftReportDto {
  @ApiProperty() @IsString() childId!: string;
  @ApiProperty() @IsString() bandId!: string;
  @ApiProperty() @IsString() periodStart!: string;
  @ApiProperty() @IsString() periodEnd!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() reportLanguage?: string;
}

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Post(':sectionId/monthly/draft')
  @RequireSectionSubjectScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({ summary: 'Draft monthly parent report (Sonnet or thin-data fallback)' })
  draft(
    @Param('sectionId') sectionId: string,
    @Body() dto: DraftReportDto,
    @Req() req: Request,
  ) {
    const teacherId =
      req.user?.memberships.find((m) => m.teacherId)?.teacherId ?? null;
    return this.service.draftMonthly({
      sectionId,
      childId: dto.childId,
      bandId: dto.bandId,
      periodStart: dto.periodStart,
      periodEnd: dto.periodEnd,
      teacherId,
      reportLanguage: dto.reportLanguage,
    });
  }

  @Post(':draftId/approve')
  @BlocksSubstituteConfirmation()
  @ApiOperation({ summary: 'Teacher approve report — never calls AI' })
  approve(@Param('draftId') draftId: string, @Req() req: Request) {
    const teacherId =
      req.user?.memberships.find((m) => m.teacherId)?.teacherId ?? null;
    if (!teacherId) {
      throw new ForbiddenException('Teacher context required');
    }
    return this.service.approve(draftId, teacherId);
  }
}
