import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import type { Request } from 'express';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { RatingsService } from './ratings.service';

class ProposeRatingDto {
  @ApiProperty() @IsString() childId!: string;
  @ApiProperty() @IsString() indicatorId!: string;
  @ApiProperty({ minimum: 1, maximum: 4 }) @IsInt() @Min(1) @Max(4) rating!: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() stage?: 'regular' | 'additional_support';
  @ApiProperty({ required: false }) @IsOptional() @IsString() captureMode?: string;
}

class BatchProposeDto {
  @ApiProperty({ type: [ProposeRatingDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProposeRatingDto)
  items!: ProposeRatingDto[];
}

@ApiTags('ratings')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('ratings')
export class RatingsController {
  constructor(private readonly service: RatingsService) {}

  @Get('areas')
  @ApiOperation({
    summary: 'List assessment areas for subject + level',
    description: 'Guideline 2083 areas (I6 indicator_count on each row).',
  })
  @ApiOkResponse({ description: 'Assessment areas' })
  listAreas(
    @Query('subjectId') subjectId: string,
    @Query('levelId') levelId: string,
  ) {
    return this.service.listAreas(subjectId, Number(levelId));
  }

  @Get('areas/:areaId/indicators')
  @ApiOperation({ summary: 'List indicators for an assessment area' })
  @ApiOkResponse({ description: 'Area + indicators' })
  listIndicators(@Param('areaId') areaId: string) {
    return this.service.listAreaIndicators(areaId);
  }

  @Post('propose')
  @ApiOperation({
    summary: 'Propose an indicator rating (never confirms)',
    description:
      'PROPOSE-only. Ratings attach to indicators (I1). Scale 1–4 (I2). ' +
      'Call POST /ratings/:id/confirm to finalize. Top rating 4 blocked on single sighting.',
  })
  propose(@Body() dto: ProposeRatingDto, @Req() req: Request) {
    const identityId =
      (req as Request & { user?: { identityId?: string } }).user?.identityId ?? null;
    return this.service.propose({
      childId: dto.childId,
      indicatorId: dto.indicatorId,
      rating: dto.rating,
      stage: dto.stage,
      captureMode: dto.captureMode,
      authorId: identityId,
    });
  }

  @Post('propose/batch')
  @ApiOperation({
    summary: 'Batch propose indicator ratings (never confirms)',
    description: 'PROPOSE-only batch for indicator sweep. Top rating 4 blocked per item.',
  })
  proposeBatch(@Body() dto: BatchProposeDto, @Req() req: Request) {
    const identityId =
      (req as Request & { user?: { identityId?: string } }).user?.identityId ?? null;
    return this.service.proposeBatch(dto.items, identityId);
  }

  @Post(':id/confirm')
  @ApiOperation({
    summary: 'Confirm a proposed rating (teacher gate)',
    description: 'CONFIRM-only — never calls AI. Corrections of confirmed rows must INSERT (I7).',
  })
  confirm(@Param('id') id: string, @Req() req: Request) {
    const identityId =
      (req as Request & { user?: { identityId?: string } }).user?.identityId ?? '';
    return this.service.confirm(id, identityId);
  }

  @Post('corrections/propose')
  @ApiOperation({
    summary: 'Propose a correction as a new rating row (I7)',
    description: 'Never UPDATEs a prior confirmed rating — append-only.',
  })
  proposeCorrection(@Body() dto: ProposeRatingDto, @Req() req: Request) {
    const identityId =
      (req as Request & { user?: { identityId?: string } }).user?.identityId ?? null;
    return this.service.proposeCorrection({
      childId: dto.childId,
      indicatorId: dto.indicatorId,
      rating: dto.rating,
      stage: dto.stage,
      captureMode: dto.captureMode ?? 'correction',
      authorId: identityId,
    });
  }
}
