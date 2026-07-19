import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
    summary: 'Planned vs actual coverage in teaching days (never joins student_outcomes)',
  })
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
