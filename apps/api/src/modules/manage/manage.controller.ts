import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequireRole } from '../auth/decorators/require-role.decorator';
import { RequireSchoolAdmin } from '../auth/decorators/require-school-admin.decorator';
import { RequireRoleGuard } from '../auth/guards/require-role.guard';
import { RequireSchoolAdminGuard } from '../auth/guards/require-school-admin.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { RequireSectionReadScope } from '../rbac/decorators/require-section-subject-scope.decorator';
import { ManageService } from './manage.service';

@ApiTags('manage')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('manage')
export class ManageController {
  constructor(private readonly service: ManageService) {}

  @Get('settling-programme/:bandId')
  @ApiOperation({ summary: 'First-month settling programme steps (config rows)' })
  settling(@Param('bandId') bandId: string) {
    return this.service.getSettlingProgramme(bandId);
  }

  @Get('admin/festival-planner')
  @UseGuards(RequireRoleGuard, RequireSchoolAdminGuard)
  @RequireRole('admin')
  @RequireSchoolAdmin({ schoolIdQuery: 'schoolId' })
  @ApiOperation({
    summary: 'Admin festival planner (school altitude)',
    description: 'Festivals + sections-behind pacing counts. No teacher profile required.',
  })
  adminFestivalPlanner(@Query('schoolId') schoolId: string) {
    return this.service.getAdminFestivalPlanner(schoolId);
  }

  @Get(':sectionId/substitute-pack')
  @RequireSectionReadScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({
    summary: 'Substitute day pack (read-only)',
    description: 'Assembles lesson, roster, schedule. Outcome confirmation remains blocked by SubstituteRoleGuard.',
  })
  substitutePack(@Param('sectionId') sectionId: string, @Query('day') day?: string) {
    return this.service.getSubstitutePack(sectionId, day);
  }

  @Get(':sectionId/catch-up/:childId')
  @RequireSectionReadScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({
    summary: 'Catch-up pack from lesson_progress × attendance',
    description: 'Generates re-teach content only — never writes student_outcomes.',
  })
  catchUp(
    @Param('sectionId') sectionId: string,
    @Param('childId') childId: string,
    @Query('bandId') bandId: string,
  ) {
    return this.service.getCatchUpPack(sectionId, childId, bandId);
  }

  @Get(':sectionId/festival-planner')
  @RequireSectionReadScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({ summary: 'Festival planner from calendar_closures + pacing' })
  festivalPlanner(@Param('sectionId') sectionId: string) {
    return this.service.getFestivalPlanner(sectionId);
  }
}
