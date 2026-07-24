import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { RequireRole } from '../auth/decorators/require-role.decorator';
import { RequireSchoolAdmin } from '../auth/decorators/require-school-admin.decorator';
import { RequireRoleGuard } from '../auth/guards/require-role.guard';
import { RequireSchoolAdminGuard } from '../auth/guards/require-school-admin.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import {
  ChildResponseDto,
  CreateChildDto,
  CreateSectionDto,
  CreateTeacherSectionDto,
  SectionResponseDto,
  TeacherRosterItemDto,
  TeacherSectionResponseDto,
  UpdateChildDto,
  UpdateChildStatusDto,
  UpdateSectionDto,
  UpdateTeacherSectionDto,
} from './dto/roster.dto';
import { RosterService } from './roster.service';

/**
 * School roster / provisioning — structural admin CRUD.
 *
 * Intentionally does NOT use AdminGravityRuleInterceptor: roster is
 * provisioning (child names, roll numbers, teacher identities), not
 * assessment aggregates. Responses must never include ratings, bands
 * distributions, or outcome data.
 */
@ApiTags('roster')
@ApiBearerAuth()
@Controller('schools/:schoolId')
@UseGuards(SupabaseAuthGuard, RequireRoleGuard, RequireSchoolAdminGuard)
@RequireRole('admin')
@RequireSchoolAdmin({ schoolIdParam: 'schoolId' })
export class RosterController {
  constructor(private readonly rosterService: RosterService) {}

  // -------------------------------------------------------------------------
  // Sections
  // -------------------------------------------------------------------------

  @Get('sections')
  @ApiOperation({ summary: 'List sections for the school' })
  @ApiOkResponse({ type: [SectionResponseDto] })
  @ApiForbiddenResponse({ description: 'Requires admin role for this school' })
  listSections(@Param('schoolId') schoolId: string) {
    return this.rosterService.listSections(schoolId);
  }

  @Post('sections')
  @ApiOperation({ summary: 'Create a section' })
  @ApiOkResponse({ type: SectionResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid band or payload' })
  createSection(
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateSectionDto,
  ) {
    return this.rosterService.createSection(schoolId, dto);
  }

  @Patch('sections/:sectionId')
  @ApiOperation({ summary: 'Update a section' })
  @ApiOkResponse({ type: SectionResponseDto })
  @ApiNotFoundResponse({ description: 'Section not found in this school' })
  updateSection(
    @Param('schoolId') schoolId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.rosterService.updateSection(schoolId, sectionId, dto);
  }

  @Delete('sections/:sectionId')
  @ApiOperation({
    summary: 'Delete a section',
    description: 'Fails with 409 if the section still has children (ON DELETE RESTRICT).',
  })
  @ApiConflictResponse({ description: 'Section still has children' })
  @ApiNotFoundResponse({ description: 'Section not found in this school' })
  deleteSection(
    @Param('schoolId') schoolId: string,
    @Param('sectionId') sectionId: string,
  ) {
    return this.rosterService.deleteSection(schoolId, sectionId);
  }

  // -------------------------------------------------------------------------
  // Children
  // -------------------------------------------------------------------------

  @Get('children')
  @ApiOperation({ summary: 'List children for the school (optional section filter)' })
  @ApiQuery({ name: 'sectionId', required: false })
  @ApiOkResponse({ type: [ChildResponseDto] })
  listChildren(
    @Param('schoolId') schoolId: string,
    @Query('sectionId') sectionId?: string,
  ) {
    return this.rosterService.listChildren(schoolId, sectionId);
  }

  @Post('children')
  @ApiOperation({ summary: 'Create a child profile in a section' })
  @ApiOkResponse({ type: ChildResponseDto })
  @ApiConflictResponse({ description: 'Roll number already exists in section' })
  @ApiNotFoundResponse({ description: 'Section not found in this school' })
  createChild(@Param('schoolId') schoolId: string, @Body() dto: CreateChildDto) {
    return this.rosterService.createChild(schoolId, dto);
  }

  @Patch('children/:childId')
  @ApiOperation({ summary: 'Update child profile fields' })
  @ApiOkResponse({ type: ChildResponseDto })
  @ApiConflictResponse({ description: 'Roll number conflict' })
  @ApiNotFoundResponse({ description: 'Child not found in this school' })
  updateChild(
    @Param('schoolId') schoolId: string,
    @Param('childId') childId: string,
    @Body() dto: UpdateChildDto,
  ) {
    return this.rosterService.updateChild(schoolId, childId, dto);
  }

  @Patch('children/:childId/status')
  @ApiOperation({
    summary: 'Update child lifecycle status',
    description:
      'Soft lifecycle via child_status enum (active|promoted|transferred|exited). No hard delete.',
  })
  @ApiOkResponse({ type: ChildResponseDto })
  updateChildStatus(
    @Param('schoolId') schoolId: string,
    @Param('childId') childId: string,
    @Body() dto: UpdateChildStatusDto,
  ) {
    return this.rosterService.updateChildStatus(schoolId, childId, dto);
  }

  // -------------------------------------------------------------------------
  // Teacher sections
  // -------------------------------------------------------------------------

  @Get('teacher-sections')
  @ApiOperation({ summary: 'List teacher↔section assignments' })
  @ApiQuery({ name: 'sectionId', required: false })
  @ApiOkResponse({ type: [TeacherSectionResponseDto] })
  listTeacherSections(
    @Param('schoolId') schoolId: string,
    @Query('sectionId') sectionId?: string,
  ) {
    return this.rosterService.listTeacherSections(schoolId, sectionId);
  }

  @Post('teacher-sections')
  @ApiOperation({
    summary: 'Assign a teacher to a section/subject grain',
    description:
      'subjectId must be null when the section’s band has no band_subjects (pre-primary); otherwise must be a band_subjects entry. Band-as-data — no grade-number branching.',
  })
  @ApiOkResponse({ type: TeacherSectionResponseDto })
  @ApiConflictResponse({ description: 'Duplicate assignment grain' })
  @ApiBadRequestResponse({ description: 'Subject does not match band' })
  createTeacherSection(
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateTeacherSectionDto,
  ) {
    return this.rosterService.createTeacherSection(schoolId, dto);
  }

  @Patch('teacher-sections/:assignmentId')
  @ApiOperation({ summary: 'Update assignment (e.g. toggle isClassTeacher)' })
  @ApiOkResponse({ type: TeacherSectionResponseDto })
  @ApiNotFoundResponse({ description: 'Assignment not found in this school' })
  updateTeacherSection(
    @Param('schoolId') schoolId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateTeacherSectionDto,
  ) {
    return this.rosterService.updateTeacherSection(schoolId, assignmentId, dto);
  }

  @Delete('teacher-sections/:assignmentId')
  @ApiOperation({ summary: 'Unassign teacher from section/subject' })
  @ApiNotFoundResponse({ description: 'Assignment not found in this school' })
  deleteTeacherSection(
    @Param('schoolId') schoolId: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.rosterService.deleteTeacherSection(schoolId, assignmentId);
  }

  // -------------------------------------------------------------------------
  // Teachers roster (for invite + assignment UI)
  // -------------------------------------------------------------------------

  @Get('teachers')
  @ApiOperation({
    summary: 'List teachers for the school with invite/account status',
  })
  @ApiOkResponse({ type: [TeacherRosterItemDto] })
  listTeachers(@Param('schoolId') schoolId: string) {
    return this.rosterService.listTeachers(schoolId);
  }
}
