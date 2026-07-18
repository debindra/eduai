import { Body, Controller, ForbiddenException, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import type { Request } from 'express';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CoachService } from './coach.service';

class CoachChatDto {
  @ApiProperty() @IsString() schoolId!: string;
  @ApiProperty() @IsString() bandId!: string;
  @ApiProperty() @IsString() message!: string;
  /** Rejected if present — coach never joins to child. */
  @ApiProperty({ required: false }) @IsOptional() @IsString() childId?: string;
}

@ApiTags('coach')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('coach')
export class CoachController {
  constructor(private readonly service: CoachService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Classroom coach chat — never joined to a child' })
  async chat(@Body() dto: CoachChatDto, @Req() req: Request) {
    const teacherId =
      req.user?.memberships.find((m) => m.teacherId)?.teacherId ?? null;
    if (!teacherId) {
      throw new ForbiddenException('Teacher context required');
    }
    
    // Validate teacher belongs to the requested school
    const teacherSchool = req.user?.memberships.find(
      (m) => m.teacherId === teacherId
    )?.schoolId;
    if (teacherSchool !== dto.schoolId) {
      throw new ForbiddenException('Teacher does not belong to the requested school');
    }
    
    return this.service.chat({
      teacherId,
      schoolId: dto.schoolId,
      bandId: dto.bandId,
      message: dto.message,
      childId: dto.childId,
    });
  }
}
