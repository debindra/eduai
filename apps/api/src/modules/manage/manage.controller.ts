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
  @ApiOperation({
    summary: 'First-month settling programme steps (config rows)',
    description: `Returns settling-in programme steps for new children.\n\nInvariant #4: Band-as-data — config rows, not grade-number branching.`,
  })
  @ApiOkResponse({ description: 'Settling programme retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiNotFoundResponse({ description: 'Band not found' })
  settling(@Param('bandId') bandId: string) {
    return this.service.getSettlingProgramme(bandId);
  }

  @Get('admin/festival-planner')
  @UseGuards(RequireRoleGuard, RequireSchoolAdminGuard)
  @RequireRole('admin')
  @RequireSchoolAdmin({ schoolIdQuery: 'schoolId' })
  @ApiOperation({
    summary: 'Admin festival planner (school altitude)',
    description: `Festivals + sections-behind pacing counts. No teacher profile required.\n\nRequires: RequireRoleGuard (role='admin') AND RequireSchoolAdminGuard (school admin for specified school).`,
  })
  @ApiOkResponse({ description: 'Festival planner data retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Not a school admin' })
  adminFestivalPlanner(@Query('schoolId') schoolId: string) {
    return this.service.getAdminFestivalPlanner(schoolId);
  }

  @Get(':sectionId/substitute-pack')
  @RequireSectionReadScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({
    summary: 'Substitute day pack (read-only)',
    description: `Assembles lesson, roster, schedule for substitute teacher.\n\nOutcome confirmation remains blocked by BlocksSubstituteConfirmation guard.\n\nRequires: RequireSectionReadScope (teacher has access to this section).`,
  })
  @ApiOkResponse({ description: 'Substitute pack assembled successfully' })
  @ApiBadRequestResponse({ description: 'Invalid day format' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section' })
  substitutePack(@Param('sectionId') sectionId: string, @Query('day') day?: string) {
    return this.service.getSubstitutePack(sectionId, day);
  }

  @Get(':sectionId/catch-up/:childId')
  @RequireSectionReadScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({
    summary: 'Catch-up pack from lesson_progress × attendance',
    description: `Generates re-teach content for absent child.\n\nInvariant #8: Coverage and learning are tracked separately — uses lesson_progress (what was taught), never writes student_outcomes.\n\nRequires: RequireSectionReadScope (teacher has access to this section).`,
  })
  @ApiOkResponse({ description: 'Catch-up pack generated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid band ID' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section' })
  @ApiNotFoundResponse({ description: 'Child or section not found' })
  catchUp(
    @Param('sectionId') sectionId: string,
    @Param('childId') childId: string,
    @Query('bandId') bandId: string,
  ) {
    return this.service.getCatchUpPack(sectionId, childId, bandId);
  }

  @Get(':sectionId/festival-planner')
  @RequireSectionReadScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({
    summary: 'Festival planner from calendar_closures + pacing',
    description: `Returns upcoming festivals with pacing impact.\n\nRequires: RequireSectionReadScope (teacher has access to this section).`,
  })
  @ApiOkResponse({ description: 'Festival planner retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section' })
  @ApiNotFoundResponse({ description: 'Section not found' })
  festivalPlanner(@Param('sectionId') sectionId: string) {
    return this.service.getFestivalPlanner(sectionId);
  }
}
