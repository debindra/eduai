import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { RequireRole } from '../auth/decorators/require-role.decorator';
import { RequireSchoolAdmin } from '../auth/decorators/require-school-admin.decorator';
import { RequireRoleGuard } from '../auth/guards/require-role.guard';
import { RequireSchoolAdminGuard } from '../auth/guards/require-school-admin.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { MessagingService } from './messaging.service';

class InboundDto {
  @ApiProperty()
  @IsString()
  childId!: string;

  @ApiProperty()
  @IsString()
  text!: string;

  @ApiProperty()
  @IsString()
  bandId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guardianId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  day?: string;
}

@ApiTags('messaging')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('messaging')
export class MessagingController {
  constructor(private readonly service: MessagingService) {}

  @Post('inbound')
  @ApiOperation({
    summary: 'Inbound family message (WhatsApp stub)',
    description: `Classifies intent and routes to appropriate handler:\n\n- Attendance → AttendanceModule (automatic marking)\n- FAQ → Auto-reply from knowledge base\n- Fees/complaints → Admin queue\n- Other → Teacher draft reply (never auto-sends)\n\nRequires: Valid child ID and band ID for intent classification.`,
  })
  @ApiOkResponse({ description: 'Message classified and routed successfully' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  inbound(@Body() dto: InboundDto) {
    return this.service.handleInbound({
      childId: dto.childId,
      text: dto.text,
      bandId: dto.bandId,
      guardianId: dto.guardianId,
      day: dto.day,
    });
  }

  @Post(':id/approve-draft')
  @ApiOperation({
    summary: 'Teacher approves draft reply',
    description: `Sends existing draft reply to guardian via WhatsApp.\n\nNever calls AI — sends pre-drafted message only. Teacher must explicitly approve before sending (Invariant #1: The level is human).`,
  })
  @ApiOkResponse({ description: 'Draft reply approved and sent successfully' })
  @ApiBadRequestResponse({ description: 'Invalid draft ID or draft already sent' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiNotFoundResponse({ description: 'Draft not found' })
  approve(@Param('id') id: string) {
    return this.service.approveDraft(id);
  }

  @Get('thread/:threadId')
  @ApiOperation({
    summary: 'Teacher thread view',
    description: 'Returns full conversation thread between teacher and guardian, including pending drafts and sent messages.',
  })
  @ApiOkResponse({ description: 'Thread retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiNotFoundResponse({ description: 'Thread not found' })
  thread(@Param('threadId') threadId: string) {
    return this.service.getThread(threadId);
  }

  @Get('teacher/drafts')
  @ApiOperation({
    summary: 'Teacher reply draft queue',
    description: 'Returns all pending draft replies awaiting teacher approval, ordered by received date.',
  })
  @ApiOkResponse({ description: 'Draft queue retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  teacherDrafts(@Query('schoolId') schoolId: string) {
    return this.service.getTeacherDrafts(schoolId);
  }

  @Get('admin/queue')
  @UseGuards(RequireRoleGuard, RequireSchoolAdminGuard)
  @RequireRole('admin')
  @RequireSchoolAdmin({ schoolIdQuery: 'schoolId' })
  @ApiOperation({
    summary: 'Admin fees/complaints queue',
    description: `Returns messages classified as fees inquiries or complaints for admin handling.\n\nRequires: RequireRoleGuard (role='admin') AND RequireSchoolAdminGuard (school admin for specified school).`,
  })
  @ApiOkResponse({ description: 'Admin queue retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Not a school admin' })
  adminQueue(@Query('schoolId') schoolId: string) {
    return this.service.getAdminQueue(schoolId);
  }
}
