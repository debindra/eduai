import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Generate daily lesson grounded in map_slice (Haiku)' })
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
  @ApiOperation({ summary: 'Mark lesson taught (coverage only — no AI)' })
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
