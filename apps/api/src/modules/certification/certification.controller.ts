import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
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
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import type { Request } from 'express';
import { RequireRole } from '../auth/decorators/require-role.decorator';
import { RequireRoleGuard } from '../auth/guards/require-role.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CertificationService } from './certification.service';

class SubmitQuizDto {
  @ApiProperty({ description: 'Number of correct answers' })
  @IsInt()
  @Min(0)
  correct!: number;

  @ApiProperty({ description: 'Total number of questions' })
  @IsInt()
  @Min(1)
  total!: number;
}

class ScoreObservationDto {
  @ApiProperty({ description: 'Teacher whose observation is being scored' })
  @IsString()
  teacherId!: string;

  @ApiProperty({ description: 'Whether the observed session passed' })
  @IsBoolean()
  passed!: boolean;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  score?: number | null;
}

@ApiTags('certification')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('certification')
export class CertificationController {
  constructor(private readonly service: CertificationService) {}

  @Get('me')
  @ApiOperation({
    summary: 'My credential progress (12 weeks + observation)',
    description: `Teacher-scoped self view of the WhatsApp credential programme.

Returns weekly quiz completion status and observation result for the authenticated teacher.

Requires: Authenticated user with teacher profile.`,
  })
  @ApiOkResponse({ description: 'Credential progress retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'No teacher profile for this account' })
  me(@Req() req: Request) {
    return this.service.getProgress(requireTeacherId(req));
  }

  @Post('me/week/:week/quiz')
  @ApiOperation({
    summary: 'Submit a weekly quiz (deterministic scoring, no AI)',
    description: `Teacher submits quiz results for a specific week (1-12).

Invariant #13: Deterministic stays deterministic — scoring is pure arithmetic (correct/total), zero AI calls.

Requires: Authenticated user with teacher profile.`,
  })
  @ApiOkResponse({ description: 'Quiz submitted and scored successfully' })
  @ApiBadRequestResponse({ description: 'Invalid week number (must be 1-12) or validation failed' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'No teacher profile for this account' })
  submitQuiz(
    @Param('week', ParseIntPipe) week: number,
    @Body() dto: SubmitQuizDto,
    @Req() req: Request,
  ) {
    return this.service.submitWeeklyQuiz(requireTeacherId(req), week, dto.correct, dto.total);
  }

  @Post('observation/score')
  @UseGuards(RequireRoleGuard)
  @RequireRole('admin')
  @ApiOperation({
    summary: 'Record the human-scored observation (assessor/admin only)',
    description: `Admin/assessor records observation session result for a teacher.

Teachers cannot self-score. Observation is human-scored in person, not AI-assisted.

Requires: RequireRoleGuard (role='admin').`,
  })
  @ApiOkResponse({ description: 'Observation score recorded successfully' })
  @ApiBadRequestResponse({ description: 'Validation failed or invalid teacher ID' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Not an admin (teachers cannot self-score)' })
  scoreObservation(@Body() dto: ScoreObservationDto, @Req() req: Request) {
    return this.service.scoreObservation(
      dto.teacherId,
      dto.passed,
      dto.score ?? null,
      req.user?.identityId ?? null,
    );
  }
}

function requireTeacherId(req: Request): string {
  const teacherId = req.user?.memberships.find((m) => m.teacherId)?.teacherId ?? null;
  if (!teacherId) {
    throw new ForbiddenException('No teacher profile for this account');
  }
  return teacherId;
}
