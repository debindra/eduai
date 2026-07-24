import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
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
import { IsOptional, IsString } from 'class-validator';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { MethodsToolkitService } from './methods-toolkit.service';

class GenerateActivityDto {
  @ApiProperty()
  @IsString()
  bandId!: string;

  @ApiProperty()
  @IsString()
  outcomeId!: string;

  @ApiProperty()
  @IsString()
  childId!: string;

  @ApiProperty()
  @IsString()
  activityType!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  schoolTier?: string;
}

@ApiTags('methods-toolkit')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('methods-toolkit')
export class MethodsToolkitController {
  constructor(private readonly service: MethodsToolkitService) {}

  @Get('menu')
  @ApiOperation({
    summary: 'Generation-menu config for remedial activities',
    description: `Returns available activity types for remedial plan generation.\n\nInvariant #4: Band-as-data — config-driven activity types, not grade-number branches.`,
  })
  @ApiOkResponse({ description: 'Activity menu retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  menu() {
    return this.service.getMenu();
  }

  @Post('generate')
  @ApiOperation({
    summary: 'Generate remedial activity (parity across tiers)',
    description: `Generates remedial activity using Claude Haiku for stalled milestone.\n\nInvariant #16: Generation parity — Free/Pro tier teachers get pedagogically identical output; tiers gate volume only, never quality.`,
  })
  @ApiOkResponse({ description: 'Remedial activity generated successfully' })
  @ApiBadRequestResponse({ description: 'Validation failed or invalid activity type' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Tier volume limit reached' })
  generate(@Body() dto: GenerateActivityDto) {
    return this.service.generate(dto);
  }
}
