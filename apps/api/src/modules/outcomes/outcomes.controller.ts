import { Body, Controller, ForbiddenException, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
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
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import type { Request } from 'express';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import {
  BlocksSubstituteConfirmation,
  RequireSectionReadScope,
  RequireSectionSubjectScope,
} from '../rbac/decorators/require-section-subject-scope.decorator';
import { OutcomesService } from './outcomes.service';

class SweepItemDto {
  @ApiProperty() @IsString() childId!: string;
  @ApiProperty() @IsString() outcomeId!: string;
  @ApiProperty() @IsString() ratingCode!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() note?: string;
}

class BatchSweepDto {
  @ApiProperty({ type: [SweepItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SweepItemDto)
  items!: SweepItemDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  subjectId?: string | null;
}

class ObservationDto {
  @ApiProperty() @IsString() bandId!: string;
  @ApiProperty() @IsString() observationText!: string;
  @ApiProperty() @IsString() outcomeId!: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() subjectId?: string | null;
}

class ConfirmDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() ratingCode?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() evidenceNote?: string;
}

@ApiTags('outcomes')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('outcomes')
export class OutcomesController {
  constructor(private readonly service: OutcomesService) {}

  @Post(':sectionId/propose/batch-sweep')
  @RequireSectionSubjectScope({ sectionIdParam: 'sectionId', subjectIdBody: 'subjectId' })
  @ApiOperation({
    summary: 'Batch sweep propose (never confirms)',
    description: `Returns proposed outcomes only — NEVER writes confirmed state to DB.

Requires: SectionSubjectWriteGuard (teacher_sections row for this section
matching either target subject or is_class_teacher = true).

This is a PROPOSE-only endpoint. Call POST /:proposalId/confirm to persist.`,
  })
  @ApiOkResponse({ description: 'Proposals created successfully' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section/subject' })
  batchSweep(
    @Param('sectionId') sectionId: string,
    @Body() dto: BatchSweepDto,
    @Req() req: Request,
  ) {
    return this.service.proposeBatchSweep(
      sectionId,
      dto.subjectId ?? null,
      dto.items,
      teacherIdFrom(req),
    );
  }

  @Post(':sectionId/propose/carry-forward')
  @RequireSectionSubjectScope({ sectionIdParam: 'sectionId', subjectIdBody: 'subjectId' })
  @ApiOperation({
    summary: 'Carry-forward propose',
    description: 'Returns proposed outcome based on prior rating — NEVER writes to DB. Call confirm to persist.',
  })
  @ApiOkResponse({ description: 'Proposal created successfully' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section/subject' })
  carryForward(
    @Param('sectionId') sectionId: string,
    @Body()
    body: { childId: string; outcomeId: string; priorRating: string; subjectId?: string | null },
    @Req() req: Request,
  ) {
    return this.service.proposeCarryForward(
      sectionId,
      body.subjectId ?? null,
      body.childId,
      body.outcomeId,
      body.priorRating,
      teacherIdFrom(req),
    );
  }

  @Post(':sectionId/propose/observation')
  @RequireSectionSubjectScope({ sectionIdParam: 'sectionId', subjectIdBody: 'subjectId' })
  @ApiOperation({
    summary: 'Voice/text mapper propose',
    description: `Maps free-text/voice observation to outcome proposal — NEVER writes to DB.

Applies all four mapper guards:
1. No instant top rating
2. Ambiguous name → returns roll number candidates
3. Non-observation (e.g., absence) → routes to attendance
4. Explicit confirmation required

Call confirm to persist after teacher review.`,
  })
  @ApiOkResponse({ description: 'Proposal created successfully' })
  @ApiBadRequestResponse({ description: 'Validation failed or mapper guard rejection' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section/subject' })
  observation(
    @Param('sectionId') sectionId: string,
    @Body() dto: ObservationDto,
    @Req() req: Request,
  ) {
    return this.service.proposeFromObservation(
      sectionId,
      dto.subjectId ?? null,
      dto.bandId,
      dto.observationText,
      dto.outcomeId,
      teacherIdFrom(req),
    );
  }

  @Post(':sectionId/propose/assessment-activity')
  @RequireSectionSubjectScope({ sectionIdParam: 'sectionId', subjectIdBody: 'subjectId' })
  @ApiOperation({
    summary: 'Assessment activity propose',
    description: 'Returns proposed outcome from structured assessment — NEVER writes to DB. Call confirm to persist.',
  })
  @ApiOkResponse({ description: 'Proposal created successfully' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section/subject' })
  assessment(
    @Param('sectionId') sectionId: string,
    @Body()
    body: { childId: string; outcomeId: string; ratingCode: string; subjectId?: string | null; note?: string },
    @Req() req: Request,
  ) {
    return this.service.proposeFromAssessmentActivity(
      sectionId,
      body.subjectId ?? null,
      body.childId,
      body.outcomeId,
      body.ratingCode,
      teacherIdFrom(req),
      body.note,
    );
  }

  @Post(':proposalId/confirm')
  @BlocksSubstituteConfirmation({
    entityLookup: {
      table: 'student_outcomes',
      idParam: 'proposalId',
      sectionColumn: 'section_id',
    },
  })
  @ApiOperation({
    summary: 'Confirm proposed outcome',
    description: `Persists AI-proposed outcome after teacher confirmation.

Requires: Teacher who created the proposal OR class teacher for the section.
Blocks substitute teachers from confirming (BlocksSubstituteConfirmation).

This is the ONLY method that writes confirmed state to student_outcomes.
Never call AI directly — use propose endpoints first.`,
  })
  @ApiOkResponse({ description: 'Outcome confirmed and persisted successfully' })
  @ApiBadRequestResponse({ description: 'Invalid proposal state or validation failed' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Not authorized to confirm this proposal (substitute or wrong teacher)' })
  @ApiNotFoundResponse({ description: 'Proposal not found' })
  async confirm(
    @Param('proposalId') proposalId: string,
    @Body() dto: ConfirmDto,
    @Req() req: Request,
  ) {
    const teacherId = teacherIdFrom(req);
    if (!teacherId) {
      throw new ForbiddenException('Teacher context required to confirm');
    }
    return this.service.confirmOutcome(proposalId, teacherId, dto);
  }

  @Get(':sectionId/proposed')
  @RequireSectionReadScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({ summary: 'List all proposed (unconfirmed) outcomes for section' })
  @ApiOkResponse({ description: 'List of proposed outcomes' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section' })
  listProposed(@Param('sectionId') sectionId: string) {
    return this.service.listProposed(sectionId);
  }

  @Get(':sectionId/sweep-context')
  @RequireSectionReadScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({
    summary: 'Sweep UI bootstrap: active children + band-derived milestones',
    description:
      'Reads band_id off the section (band-as-data). Optional subjectId filters outcomes for Grade 1+ subject teachers. Children ordered by roll number only — never by rating.',
  })
  sweepContext(
    @Param('sectionId') sectionId: string,
    @Query('subjectId') subjectId?: string,
  ) {
    return this.service.getSweepContext(sectionId, subjectId || null);
  }

  @Get(':sectionId/stalled')
  @RequireSectionReadScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({
    summary: 'List stalled milestones for inclusive support',
    description: `Returns milestones with no progress in specified weeks (default 3).

Private teacher tool for remedial planning — NOT an admin flag.
Results used to trigger remedial workflows.`,
  })
  @ApiOkResponse({ description: 'List of stalled milestones' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section' })
  stalled(
    @Param('sectionId') sectionId: string,
    @Query('weeks') weeks?: string,
  ) {
    return this.service.listStalledMilestones(sectionId, weeks ? Number(weeks) : 3);
  }
}

function teacherIdFrom(req: Request): string | null {
  return req.user?.memberships.find((m) => m.teacherId)?.teacherId ?? null;
}
