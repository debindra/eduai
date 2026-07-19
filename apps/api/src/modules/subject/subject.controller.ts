import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ForbiddenException } from '@nestjs/common';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import {
  RequireSectionReadScope,
  RequireSectionSubjectScope,
} from '../rbac/decorators/require-section-subject-scope.decorator';
import { SubjectService } from './subject.service';

@ApiTags('subject')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('subject')
export class SubjectController {
  constructor(private readonly service: SubjectService) {}

  @Get('section/:sectionId/subject/:subjectId')
  @RequireSectionSubjectScope({
    sectionIdParam: 'sectionId',
    subjectIdParam: 'subjectId',
  })
  @ApiOperation({
    summary: 'Subject-teacher view (write subject / read section roster)',
  })
  async subjectView(
    @Param('sectionId') sectionId: string,
    @Param('subjectId') subjectId: string,
    @Req() req: Request,
  ) {
    const teacherId = teacherIdFrom(req);
    if (!teacherId) throw new ForbiddenException('Teacher profile required');
    try {
      return await this.service.getSubjectTeacherView(teacherId, sectionId, subjectId);
    } catch (err) {
      if (err instanceof Error && err.message.includes('Write scope denied')) {
        throw new ForbiddenException(err.message);
      }
      throw err;
    }
  }

  @Get('section/:sectionId/oversight')
  @RequireSectionReadScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({
    summary: 'Class-teacher oversight + report assembly inputs',
    description: 'Section-wide child summaries with per-child letter grades (never ranked).',
  })
  oversight(@Param('sectionId') sectionId: string) {
    return this.service.getClassTeacherOversight(sectionId);
  }
}

function teacherIdFrom(req: Request): string | null {
  return req.user?.memberships.find((m) => m.teacherId)?.teacherId ?? null;
}
