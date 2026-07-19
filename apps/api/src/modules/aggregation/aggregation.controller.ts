import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { RequireSectionReadScope } from '../rbac/decorators/require-section-subject-scope.decorator';
import { AggregationService } from './aggregation.service';

@ApiTags('aggregation')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('aggregation')
export class AggregationController {
  constructor(private readonly service: AggregationService) {}

  @Get('child/:childId')
  @ApiOperation({
    summary: 'Per-child letter grade (deterministic)',
    description:
      'Σ ÷ (4 × n) × 100 → letter from grade_scales cut-offs. Zero AI. Never ranks across children.',
  })
  aggregateChild(
    @Param('childId') childId: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.service.aggregateChild(
      childId,
      subjectId === undefined ? undefined : subjectId === 'null' ? null : subjectId,
    );
  }

  @Get('section/:sectionId/child/:childId')
  @RequireSectionReadScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({ summary: 'Scoped per-child aggregation (section read)' })
  aggregateChildScoped(
    @Param('childId') childId: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.service.aggregateChild(
      childId,
      subjectId === undefined ? undefined : subjectId === 'null' ? null : subjectId,
    );
  }
}
