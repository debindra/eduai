import { Body, Controller, ForbiddenException, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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
  @ApiOperation({
    summary: 'Draft monthly parent report (Sonnet or thin-data fallback)',
    description: `Generates a PROPOSED monthly report for teacher review using Claude Sonnet.\n\nInvariant #12: No fiction — thin data triggers neutral fallback template, never generated placeholder narratives.\n\nThis is a DRAFT-only endpoint. Call POST /:draftId/approve to send to parents.\n\nRequires: SectionSubjectWriteGuard (teacher for this section).`,
  })
  @ApiOkResponse({ description: 'Report draft created successfully' })
  @ApiBadRequestResponse({ description: 'Validation failed or invalid date range' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section' })
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
  @ApiOperation({
    summary: 'Teacher approve report — never calls AI',
    description: `Confirms and sends report draft to parents via WhatsApp.\n\nInvariant #1: The level is human — teacher must explicitly approve before sending.\n\nNever calls AI — sends existing draft only. Blocks substitute teachers from approving.`,
  })
  @ApiOkResponse({ description: 'Report approved and sent successfully' })
  @ApiBadRequestResponse({ description: 'Invalid draft state or draft already approved' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Not authorized (substitute or wrong teacher)' })
  @ApiNotFoundResponse({ description: 'Draft not found' })
  approve(@Param('draftId') draftId: string, @Req() req: Request) {
    const teacherId =
      req.user?.memberships.find((m) => m.teacherId)?.teacherId ?? null;
    if (!teacherId) {
      throw new ForbiddenException('Teacher context required');
    }
    return this.service.approve(draftId, teacherId);
  }
}
