import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { RequireSectionReadScope } from '../rbac/decorators/require-section-subject-scope.decorator';
import { AggregationService } from './aggregation.service';

@ApiTags('aggregation')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('aggregation')
export class AggregationController {
  constructor(private readonly service: AggregationService) {}

  @Get('area/:areaId/child/:childId')
  @ApiOperation({
    summary: 'Per-area achievement (I6–I8)',
    description:
      'Computed from annex indicator_count. Incomplete areas return withheld + missing indicator codes — never a partial percentage.',
  })
  @ApiOkResponse({ description: 'Area achievement or withheld' })
  aggregateArea(
    @Param('childId') childId: string,
    @Param('areaId') areaId: string,
  ) {
    return this.service.aggregateArea(childId, areaId);
  }

  @Get('subject/:subjectId/child/:childId')
  @ApiOperation({
    summary: 'Subject overall from assessment areas (I8)',
    description:
      'Aggregates area achievements. Any withheld area withholds the subject result.',
  })
  @ApiOkResponse({ description: 'Subject aggregation or withheld' })
  aggregateSubject(
    @Param('childId') childId: string,
    @Param('subjectId') subjectId: string,
    @Query('levelId') levelId = '4',
  ) {
    return this.service.aggregateSubjectByAreas(
      childId,
      subjectId,
      Number(levelId),
    );
  }

  @Get('child/:childId')
  @ApiOperation({
    summary: 'Per-child letter grade (deterministic, legacy outcomes path)',
    description: `Calculates letter grade using formula: Σ ÷ (4 × n) × 100 → letter from grade_scales cut-offs.\n\nInvariant #13: Deterministic stays deterministic — pure arithmetic, zero AI calls.\n\nInvariant #2: Never ranks across children — this aggregates a single child only.`,
  })
  @ApiOkResponse({ description: 'Child aggregation calculated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid child ID or subject ID' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiNotFoundResponse({ description: 'Child not found' })
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
  @ApiOperation({
    summary: 'Scoped per-child aggregation (section read)',
    description: `Same deterministic aggregation as /child/:childId but enforces section read scope.\n\nRequires: RequireSectionReadScope (teacher has access to this section).`,
  })
  @ApiOkResponse({ description: 'Child aggregation calculated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid child ID or subject ID' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section' })
  @ApiNotFoundResponse({ description: 'Child not found' })
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
