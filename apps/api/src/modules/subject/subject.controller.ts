import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
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
    description: `Returns subject-specific data for a teacher with write scope on this subject.\n\nInvariant #9: Two-grain RLS from Grade 1 — write scope is (section_id, subject_id); read scope section-wide.\n\nRequires: SectionSubjectWriteGuard (teacher assigned to this section+subject).`,
  })
  @ApiOkResponse({ description: 'Subject view retrieved successfully' })
  @ApiBadRequestResponse({ description: 'Invalid section or subject ID' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Write scope denied for this subject' })
  @ApiNotFoundResponse({ description: 'Section or subject not found' })
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
    description: `Section-wide child summaries with per-child letter grades.\n\nInvariant #2: Never ranks across children — returns individual child summaries only, never ordered by rating.\n\nRequires: RequireSectionReadScope (class teacher for this section).`,
  })
  @ApiOkResponse({ description: 'Class oversight data retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section' })
  @ApiNotFoundResponse({ description: 'Section not found' })
  oversight(@Param('sectionId') sectionId: string) {
    return this.service.getClassTeacherOversight(sectionId);
  }
}

function teacherIdFrom(req: Request): string | null {
  return req.user?.memberships.find((m) => m.teacherId)?.teacherId ?? null;
}
