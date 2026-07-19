import { Controller, ForbiddenException, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { RequireRole } from '../auth/decorators/require-role.decorator';
import { RequireRoleGuard } from '../auth/guards/require-role.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { TeacherContextResponseDto } from './dto/teacher-context.dto';
import { TeacherContextService } from './teacher-context.service';

@ApiTags('teacher-context')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RequireRoleGuard)
@RequireRole('teacher')
@Controller('teacher')
export class TeacherContextController {
  constructor(private readonly service: TeacherContextService) {}

  @Get('me/context')
  @ApiOperation({
    summary: 'Logged-in teacher section/subject/band assignments',
    description:
      "Returns only the calling teacher's own teacher_sections scope — no cross-teacher data, no distributions.",
  })
  @ApiOkResponse({ type: TeacherContextResponseDto })
  me(@Req() req: Request): Promise<TeacherContextResponseDto> {
    return this.service.getContext(requireTeacherId(req));
  }
}

function requireTeacherId(req: Request): string {
  const teacherId = req.user?.memberships.find((m) => m.teacherId)?.teacherId ?? null;
  if (!teacherId) {
    throw new ForbiddenException('No teacher profile for this account');
  }
  return teacherId;
}
