import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
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
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsString, ValidateNested } from 'class-validator';
import type { Request } from 'express';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import {
  RequireSectionReadScope,
  RequireSectionSubjectScope,
} from '../rbac/decorators/require-section-subject-scope.decorator';
import { AttendanceService, type AttendanceStatus } from './attendance.service';

class AttendanceMarkDto {
  @ApiProperty()
  @IsString()
  childId!: string;

  @ApiProperty({ enum: ['present', 'absent', 'late', 'excused'] })
  @IsIn(['present', 'absent', 'late', 'excused'])
  status!: AttendanceStatus;
}

class OneTapAttendanceDto {
  @ApiProperty()
  @IsString()
  day!: string;

  @ApiProperty({ type: [AttendanceMarkDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceMarkDto)
  marks!: AttendanceMarkDto[];
}

@ApiTags('attendance')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Post(':sectionId/one-tap')
  @RequireSectionSubjectScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({
    summary: 'One-tap attendance with WhatsApp guardian confirmation',
    description: `Batch attendance marking for the section with automatic WhatsApp confirmation to guardians.\n\nSupports status: present, absent, late, excused. Guardians receive notification via WhatsApp for absences/late arrivals.\n\nRequires: SectionSubjectWriteGuard (teacher for this section).`,
  })
  @ApiOkResponse({ description: 'Attendance marked successfully, guardian notifications queued' })
  @ApiBadRequestResponse({ description: 'Validation failed or invalid day format' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section' })
  oneTap(
    @Param('sectionId') sectionId: string,
    @Body() dto: OneTapAttendanceDto,
    @Req() req: Request,
  ) {
    const teacherId =
      req.user?.memberships.find((m) => m.teacherId)?.teacherId ?? null;
    return this.service.oneTapMark(sectionId, dto.day, dto.marks, teacherId);
  }

  @Get(':sectionId')
  @RequireSectionReadScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({
    summary: 'List children for attendance day',
    description: `Returns all children in section with attendance status for specified day.\n\nRequires: RequireSectionReadScope (teacher has access to this section).`,
  })
  @ApiOkResponse({ description: 'Children list with attendance status retrieved successfully' })
  @ApiBadRequestResponse({ description: 'Invalid day format' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Insufficient permissions for this section' })
  list(@Param('sectionId') sectionId: string, @Query('day') day: string) {
    return this.service.listForDay(sectionId, day);
  }
}
