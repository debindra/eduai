import { Body, Controller, ForbiddenException, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import type { Request } from 'express';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { BlocksSubstituteConfirmation, RequireSectionSubjectScope } from '../rbac/decorators/require-section-subject-scope.decorator';
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
  @ApiOperation({ summary: 'Batch sweep propose (never confirms)' })
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
  @ApiOperation({ summary: 'Carry-forward propose' })
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
  @ApiOperation({ summary: 'Voice/text mapper propose' })
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
  @ApiOperation({ summary: 'Assessment activity propose' })
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
  @ApiOperation({ summary: 'Confirm proposed outcome — only write path for confirmed' })
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
  @RequireSectionSubjectScope({ sectionIdParam: 'sectionId' })
  listProposed(@Param('sectionId') sectionId: string) {
    return this.service.listProposed(sectionId);
  }

  @Get(':sectionId/stalled')
  @RequireSectionSubjectScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({ summary: 'Private inclusive-assistant stall prompt (not admin flag)' })
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
