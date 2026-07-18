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
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import type { Request } from 'express';
import { RequireRole } from '../auth/decorators/require-role.decorator';
import { RequireRoleGuard } from '../auth/guards/require-role.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import {
  BlocksSubstituteConfirmation,
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
  @ApiOperation({ summary: 'Open a remedial plan (state=opened)' })
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
  @ApiOperation({ summary: 'Mark methods-toolkit activity delivered' })
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
    description: 'Writes proposed student_outcomes with attempt=after_support only.',
  })
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
    summary: 'Close (pass) or escalate based on confirmed after_support rating',
  })
  closeAfterReassess(
    @Param('planId') planId: string,
    @Body() dto: CloseAfterReassessDto,
  ) {
    return this.service.closeAfterReassess(planId, dto.confirmedRatingCode);
  }

  @Post('plans/:planId/escalate')
  @ApiOperation({ summary: 'Escalate to upcharatmak + class-teacher notify path' })
  escalate(@Param('planId') planId: string) {
    return this.service.escalate(planId);
  }

  @Post('plans/:planId/close')
  @ApiOperation({ summary: 'Close remedial plan' })
  close(@Param('planId') planId: string, @Body() body: { reason?: string }) {
    return this.service.close(planId, body.reason ?? 'manual_close');
  }

  @Get('section/:sectionId/plans')
  @RequireSectionSubjectScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({ summary: 'List remedial plans for section (teacher sees names)' })
  list(@Param('sectionId') sectionId: string) {
    return this.service.listForSection(sectionId, true);
  }

  @Get('admin/open-loop-counts')
  @UseGuards(RequireRoleGuard)
  @RequireRole('admin')
  @ApiOperation({
    summary: 'Admin open-loop counts (gravity)',
    description: 'Counts/shapes only — never child names or rating distributions.',
  })
  adminCounts(@Query('schoolId') schoolId: string) {
    return this.service.adminOpenLoopCounts(schoolId);
  }

  @Post('run-reminders')
  @ApiOperation({
    summary: 'Tick: quiet-hours-aware reminders + escalate when exhausted',
  })
  runReminders() {
    return this.service.runReminders();
  }
}

function teacherIdFrom(req: Request): string | null {
  return req.user?.memberships.find((m) => m.teacherId)?.teacherId ?? null;
}
