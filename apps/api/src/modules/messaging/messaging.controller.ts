import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { RequireRole } from '../auth/decorators/require-role.decorator';
import { RequireRoleGuard } from '../auth/guards/require-role.guard';
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
    description:
      'Classifies intent: attendance → AttendanceModule; FAQ auto-reply; fees/complaints → admin; else teacher draft (never auto-sends).',
  })
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
    description: 'Never calls AI — sends existing draft_reply only.',
  })
  approve(@Param('id') id: string) {
    return this.service.approveDraft(id);
  }

  @Get('thread/:threadId')
  @ApiOperation({ summary: 'Teacher thread view' })
  thread(@Param('threadId') threadId: string) {
    return this.service.getThread(threadId);
  }

  @Get('teacher/drafts')
  @ApiOperation({ summary: 'Teacher reply draft queue' })
  teacherDrafts(@Query('schoolId') schoolId: string) {
    return this.service.getTeacherDrafts(schoolId);
  }

  @Get('admin/queue')
  @UseGuards(RequireRoleGuard)
  @RequireRole('admin')
  @ApiOperation({ summary: 'Admin fees/complaints queue' })
  adminQueue(@Query('schoolId') schoolId: string) {
    return this.service.getAdminQueue(schoolId);
  }
}
