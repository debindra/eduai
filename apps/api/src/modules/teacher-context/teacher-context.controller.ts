import { Controller, ForbiddenException, Get, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
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
      `Returns only the calling teacher's own teacher_sections scope.\n\nInvariant #3 (Gravity Rule): Returns own assignments only — no cross-teacher data, no distributions.\n\nRequires: RequireRoleGuard (role='teacher').`,
  })
  @ApiOkResponse({ type: TeacherContextResponseDto })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'No teacher profile for this account' })
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
