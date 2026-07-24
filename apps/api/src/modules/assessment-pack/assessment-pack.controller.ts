import { Body, Controller, Post, UseGuards } from '@nestjs/common';
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
  IsString,
  ValidateNested,
} from 'class-validator';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { renderDualPack } from './dual-render';

class PackItemDto {
  @ApiProperty() @IsString() code!: string;
  @ApiProperty() @IsString() statement!: string;
  @ApiProperty({ type: [String] }) @IsArray() descriptors!: string[];
}

class PackActivityDto {
  @ApiProperty() @IsString() title!: string;
  @ApiProperty({ type: [String] }) @IsArray() steps!: string[];
}

class GeneratePackDto {
  @ApiProperty() @IsString() schoolName!: string;
  @ApiProperty() @IsString() periodLabel!: string;
  @ApiProperty({ type: [PackItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackItemDto)
  items!: PackItemDto[];
  @ApiProperty({ type: [PackActivityDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PackActivityDto)
  activities!: PackActivityDto[];
}

@ApiTags('assessment-pack')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('assessment-pack')
export class AssessmentPackController {
  @Post('generate')
  @ApiOperation({
    summary: 'Dual-render assessment pack (web + WhatsApp/PDF)',
    description:
      'One generation → interactive web pack + self-contained WhatsApp/PDF digest ' +
      '(Assessment Pack Spec v1.1). Digest must be usable without opening the web.',
  })
  @ApiOkResponse({ description: 'Dual-render payloads' })
  generate(@Body() dto: GeneratePackDto) {
    return renderDualPack(dto);
  }
}
