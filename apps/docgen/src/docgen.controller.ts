import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { DeterministicRendererService } from './rendering/deterministic-renderer.service';
import { SupabaseService } from './database/supabase.service';
import { DB_PACKAGE_VERSION } from '@eduai/db';

class InspectionPackDto {
  @ApiProperty()
  @IsString()
  sectionId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateEnd?: string;
}

@ApiTags('docgen')
@Controller()
export class DocgenController {
  constructor(
    private readonly renderer: DeterministicRendererService,
    private readonly supabase: SupabaseService,
  ) {}

  @Get('health')
  @ApiOperation({ summary: 'DocGen health check' })
  async health() {
    const db = await this.supabase.ping();
    return { status: 'ok', service: 'docgen', dbPackage: DB_PACKAGE_VERSION, db };
  }

  @Get('docgen/assessment-log/:childId')
  @ApiOperation({
    summary: 'Render assessment log (deterministic, zero AI)',
    description: 'Pure template render over confirmed student_outcomes. Writes document_render with source_row_hash.',
  })
  assessmentLog(
    @Param('childId') childId: string,
    @Query('periodStart') periodStart?: string,
    @Query('periodEnd') periodEnd?: string,
  ) {
    return this.renderer.renderAssessmentLog(childId, periodStart, periodEnd);
  }

  @Get('docgen/transition-file/:childId')
  @ApiOperation({ summary: 'Render transition file (deterministic)' })
  transitionFile(@Param('childId') childId: string) {
    return this.renderer.renderTransitionFile(childId);
  }

  @Get('docgen/monthly-report/:draftId')
  @ApiOperation({
    summary: 'Render approved parent report draft (deterministic)',
    description: 'Renders already-approved parent_report_drafts text only — never calls AI.',
  })
  monthlyReport(@Param('draftId') draftId: string) {
    return this.renderer.renderMonthlyReport(draftId);
  }

  @Post('docgen/inspection-pack')
  @ApiOperation({
    summary: 'Batch inspection pack for a section',
    description: 'Batch invocation of assessment log + transition file per child.',
  })
  inspectionPack(@Body() dto: InspectionPackDto) {
    return this.renderer.renderInspectionPack(dto.sectionId, dto.dateStart, dto.dateEnd);
  }

  @Post('docgen/leaving-pack/:childId')
  @ApiOperation({ summary: 'Leaving pack (assessment log + transition file bundle)' })
  leavingPack(@Param('childId') childId: string) {
    return this.renderer.renderLeavingPack(childId);
  }
}
