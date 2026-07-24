import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
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
import { IsOptional, IsString } from 'class-validator';
import type { Request } from 'express';
import { RequireRole } from '../auth/decorators/require-role.decorator';
import { RequireSchoolAdmin } from '../auth/decorators/require-school-admin.decorator';
import { RequireRoleGuard } from '../auth/guards/require-role.guard';
import { RequireSchoolAdminGuard } from '../auth/guards/require-school-admin.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import {
  BlocksSubstituteConfirmation,
  RequireSectionReadScope,
  RequireSectionSubjectScope,
} from '../rbac/decorators/require-section-subject-scope.decorator';
import { RemedialService } from './remedial.service';

class OpenRemedialDto {
  @ApiProperty()
  @IsString()
  childId!: string;

  @ApiProperty()
  @IsString()
  outcomeId!: string;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsString()
  subjectId?: string | null;
}

class DeliverActivityDto {
  @ApiProperty()
  @IsString()
  activityRef!: string;
}

class ReassessDto {
  @ApiProperty()
  @IsString()
  ratingCode!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  note?: string;
}

class CloseAfterReassessDto {
  @ApiProperty({ description: 'Confirmed after_support rating code' })
  @IsString()
  confirmedRatingCode!: string;
}

@ApiTags('remedial')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('remedial')
export class RemedialController {
  constructor(private readonly service: RemedialService) {}

  @Post('section/:sectionId/open')
  @RequireSectionSubjectScope({
    sectionIdParam: 'sectionId',
    subjectIdBody: 'subjectId',
  })
  @ApiOperation({
    summary: 'Open a remedial plan',
    description: `Creates remedial_plan record with state=opened for a stalled milestone.

Requires: SectionSubjectWriteGuard.
Triggers: Remedial workflow (activity delivery → reassessment → close/escalate).`,
  })
  @ApiOkResponse({ description: 'Remedial plan created successfully' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section/subject' })
  open(
    @Param('sectionId') sectionId: string,
    @Body() dto: OpenRemedialDto,
    @Req() req: Request,
  ) {
    return this.service.open({
      childId: dto.childId,
      outcomeId: dto.outcomeId,
      sectionId,
      subjectId: dto.subjectId ?? null,
      teacherId: teacherIdFrom(req),
    });
  }

  @Post('plans/:planId/deliver')
  @BlocksSubstituteConfirmation({
    entityLookup: {
      table: 'remedial_plans',
      idParam: 'planId',
      sectionColumn: 'section_id',
    },
  })
  @ApiOperation({
    summary: 'Mark methods-toolkit activity delivered',
    description: `Transitions remedial plan from opened → activity_delivered.

Blocks substitute teachers from confirming delivery.`,
  })
  @ApiOkResponse({ description: 'Activity marked as delivered' })
  @ApiBadRequestResponse({ description: 'Invalid plan state or validation failed' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Not authorized (substitute or wrong teacher)' })
  @ApiNotFoundResponse({ description: 'Remedial plan not found' })
  deliver(@Param('planId') planId: string, @Body() dto: DeliverActivityDto) {
    return this.service.deliverActivity(planId, dto.activityRef);
  }

  @Post('plans/:planId/reassess')
  @BlocksSubstituteConfirmation({
    entityLookup: {
      table: 'remedial_plans',
      idParam: 'planId',
      sectionColumn: 'section_id',
    },
  })
  @ApiOperation({
    summary: 'Propose after_support re-assessment (never confirms)',
    description: `Writes PROPOSED student_outcomes with attempt=after_support — does not confirm.

Requires: Teacher must confirm via closeAfterReassess to persist final state.
Blocks substitute teachers.`,
  })
  @ApiOkResponse({ description: 'Reassessment proposal created' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Not authorized (substitute or wrong teacher)' })
  @ApiNotFoundResponse({ description: 'Remedial plan not found' })
  reassess(
    @Param('planId') planId: string,
    @Body() dto: ReassessDto,
    @Req() req: Request,
  ) {
    return this.service.reassess(planId, dto.ratingCode, teacherIdFrom(req), dto.note);
  }

  @Post('plans/:planId/close-after-reassess')
  @BlocksSubstituteConfirmation({
    entityLookup: {
      table: 'remedial_plans',
      idParam: 'planId',
      sectionColumn: 'section_id',
    },
  })
  @ApiOperation({
    summary: 'Close (pass) or escalate based on confirmed rating',
    description: `Confirms after_support outcome and closes plan if improvement shown.

If rating still stalled: escalates to upcharatmak (principal pathway).
Blocks substitute teachers.`,
  })
  @ApiOkResponse({ description: 'Remedial plan closed or escalated' })
  @ApiBadRequestResponse({ description: 'Invalid rating or plan state' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Not authorized (substitute or wrong teacher)' })
  @ApiNotFoundResponse({ description: 'Remedial plan not found' })
  closeAfterReassess(
    @Param('planId') planId: string,
    @Body() dto: CloseAfterReassessDto,
  ) {
    return this.service.closeAfterReassess(planId, dto.confirmedRatingCode);
  }

  @Post('plans/:planId/escalate')
  @ApiOperation({
    summary: 'Escalate to upcharatmak (principal pathway)',
    description: `Manual escalation to class teacher + principal notification.

Transitions plan to escalated state.
Triggers job workflow for remedial escalation.`,
  })
  @ApiOkResponse({ description: 'Plan escalated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid plan state' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiNotFoundResponse({ description: 'Remedial plan not found' })
  escalate(@Param('planId') planId: string) {
    return this.service.escalate(planId);
  }

  @Post('plans/:planId/close')
  @ApiOperation({
    summary: 'Close remedial plan',
    description: 'Manual closure of remedial plan with optional reason.',
  })
  @ApiOkResponse({ description: 'Plan closed successfully' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiNotFoundResponse({ description: 'Remedial plan not found' })
  close(@Param('planId') planId: string, @Body() body: { reason?: string }) {
    return this.service.close(planId, body.reason ?? 'manual_close');
  }

  @Get('section/:sectionId/plans')
  @RequireSectionReadScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({
    summary: 'List remedial plans for section',
    description: 'Teacher sees child names (section scope). Ordered by state, created date.',
  })
  @ApiOkResponse({ description: 'List of remedial plans' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section' })
  list(@Param('sectionId') sectionId: string) {
    return this.service.listForSection(sectionId, true);
  }

  @Get('admin/open-loop-counts')
  @UseGuards(RequireRoleGuard, RequireSchoolAdminGuard)
  @RequireRole('admin')
  @RequireSchoolAdmin({ schoolIdQuery: 'schoolId' })
  @ApiOperation({
    summary: 'Admin open-loop counts (gravity rule)',
    description: `Returns aggregate counts/shapes ONLY — never child names or rating distributions.

Enforces Invariant #3 (gravity rule): Admin sees practice-level aggregates, not individual data.`,
  })
  @ApiOkResponse({ description: 'Aggregate counts (no child data)' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Not a school admin' })
  adminCounts(@Query('schoolId') schoolId: string) {
    return this.service.adminOpenLoopCounts(schoolId);
  }

  @Post('run-reminders')
  @ApiOperation({
    summary: 'Tick: quiet-hours-aware reminders + auto-escalate',
    description: `Job workflow endpoint: sends reminders for stalled plans, escalates when max reminders reached.

Respects quiet hours (outside school time). Called by scheduled job.`,
  })
  @ApiOkResponse({ description: 'Reminders processed successfully' })
  runReminders() {
    return this.service.runReminders();
  }
}

function teacherIdFrom(req: Request): string | null {
  return req.user?.memberships.find((m) => m.teacherId)?.teacherId ?? null;
}
