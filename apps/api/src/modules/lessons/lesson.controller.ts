import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { IsString } from 'class-validator';
import type { Request } from 'express';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { RequireSectionSubjectScope } from '../rbac/decorators/require-section-subject-scope.decorator';
import { LessonService } from './lesson.service';

class GenerateLessonDto {
  @ApiProperty() @IsString() bandId!: string;
  @ApiProperty() @IsString() date!: string;
}

class MarkDoneDto {
  @ApiProperty() @IsString() mapSliceId!: string;
}

@ApiTags('lessons')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('lessons')
export class LessonController {
  constructor(private readonly service: LessonService) {}

  @Post(':sectionId/generate')
  @RequireSectionSubjectScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({
    summary: 'Generate daily lesson grounded in map_slice (Haiku)',
    description: `Generates lesson plan using Claude Haiku, grounded in the yearly map slice for the specified date.\n\nInvariant #16: Generation parity — Free/Pro tier teachers get identical lesson quality, different volume limits.\n\nRequires: SectionSubjectWriteGuard (teacher for this section).`,
  })
  @ApiOkResponse({ description: 'Lesson generated successfully' })
  @ApiBadRequestResponse({ description: 'Validation failed or no map slice found for date' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section or tier limit reached' })
  generate(
    @Param('sectionId') sectionId: string,
    @Body() dto: GenerateLessonDto,
    @Req() req: Request,
  ) {
    const teacherId =
      req.user?.memberships.find((m) => m.teacherId)?.teacherId ?? null;
    return this.service.generate(sectionId, dto.bandId, dto.date, teacherId);
  }

  @Post(':sectionId/mark-done')
  @RequireSectionSubjectScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({
    summary: 'Mark lesson taught (coverage only — no AI)',
    description: `Marks lesson as delivered in lesson_progress table.\n\nInvariant #8: Coverage and learning are tracked separately. This marks what was TAUGHT, never what children LEARNED. Never calls AI.\n\nRequires: SectionSubjectWriteGuard (teacher for this section).`,
  })
  @ApiOkResponse({ description: 'Lesson marked as taught successfully' })
  @ApiBadRequestResponse({ description: 'Validation failed or invalid map slice ID' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section' })
  markDone(
    @Param('sectionId') sectionId: string,
    @Body() dto: MarkDoneDto,
    @Req() req: Request,
  ) {
    const teacherId =
      req.user?.memberships.find((m) => m.teacherId)?.teacherId ?? null;
    return this.service.markDone(sectionId, dto.mapSliceId, teacherId);
  }
}
