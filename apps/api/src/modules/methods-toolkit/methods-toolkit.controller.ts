import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
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
    description: 'Config-driven activity types — not grade-number branches.',
  })
  menu() {
    return this.service.getMenu();
  }

  @Post('generate')
  @ApiOperation({
    summary: 'Generate remedial activity (parity across tiers)',
    description: 'Free/Pro get pedagogically identical output; tiers gate volume only.',
  })
  generate(@Body() dto: GenerateActivityDto) {
    return this.service.generate(dto);
  }
}
