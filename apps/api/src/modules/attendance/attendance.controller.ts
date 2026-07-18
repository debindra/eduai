import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsString, ValidateNested } from 'class-validator';
import type { Request } from 'express';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { RequireSectionSubjectScope } from '../rbac/decorators/require-section-subject-scope.decorator';
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
  @ApiOperation({ summary: 'One-tap attendance with WhatsApp guardian confirmation' })
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
  @RequireSectionSubjectScope({ sectionIdParam: 'sectionId' })
  @ApiOperation({ summary: 'List children for attendance day' })
  list(@Param('sectionId') sectionId: string, @Query('day') day: string) {
    return this.service.listForDay(sectionId, day);
  }
}
