import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { RequireSectionReadScope } from '../rbac/decorators/require-section-subject-scope.decorator';
import { PacingService } from './pacing.service';

@ApiTags('pacing')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('pacing')
export class PacingController {
  constructor(private readonly service: PacingService) {}

  @Get(':sectionId')
  @RequireSectionReadScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({
    summary: 'Planned vs actual coverage in teaching days',
    description: `Returns pacing view: teaching days planned vs. teaching days consumed from lesson_progress.\n\nInvariant #8: Coverage and learning are tracked separately. This endpoint reports what was TAUGHT (lesson_progress), never what children LEARNED (student_outcomes). Never joins student_outcomes.\n\nRequires: RequireSectionReadScope (teacher has access to this section).`,
  })
  @ApiOkResponse({ description: 'Pacing data retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section' })
  getPacing(
    @Param('sectionId') sectionId: string,
    @Query('asOf') asOf?: string,
    @Query('previouslyBehind') previouslyBehind?: string,
  ) {
    return this.service.getPacing(
      sectionId,
      asOf,
      previouslyBehind === 'true' || previouslyBehind === '1',
    );
  }
}
