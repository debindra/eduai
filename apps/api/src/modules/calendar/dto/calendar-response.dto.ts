import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class FestivalClosureDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Existing closure id to update' })
  @IsOptional()
  @IsUUID('loose')
  id?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '2025-10-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2025-10-10' })
  @IsDateString()
  endDate!: string;
}

export class PatchFestivalTemplateDto {
  @ApiProperty({ type: [FestivalClosureDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => FestivalClosureDto)
  closures!: FestivalClosureDto[];
}

export class FestivalClosureResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  startDate!: string;

  @ApiProperty()
  endDate!: string;

  @ApiProperty({ enum: ['festival_template'] })
  source!: 'festival_template';
}

export class FestivalTemplateResponseDto {
  @ApiProperty({ format: 'uuid' })
  schoolCalendarId!: string;

  @ApiProperty({ type: [FestivalClosureResponseDto] })
  closures!: FestivalClosureResponseDto[];
}

export class CalendarSetupResponseDto {
  @ApiProperty({ format: 'uuid' })
  schoolCalendarId!: string;

  @ApiProperty()
  academicYearLabel!: string;

  @ApiProperty({ enum: ['draft'] })
  approvalStatus!: 'draft';
}

export class CalendarStatusResponseDto {
  @ApiProperty({ enum: ['none', 'draft', 'approved'] })
  approvalStatus!: 'none' | 'draft' | 'approved';

  @ApiPropertyOptional({ format: 'uuid' })
  schoolCalendarId?: string;

  @ApiPropertyOptional()
  academicYearLabel?: string;
}

export class ApproveCalendarResponseDto {
  @ApiProperty({ format: 'uuid' })
  schoolCalendarId!: string;

  @ApiProperty({ enum: ['approved'] })
  approvalStatus!: 'approved';

  @ApiProperty()
  approvedAt!: string;
}

export class TeachingDaysTerminalCountDto {
  @ApiProperty({ format: 'uuid' })
  terminalId!: string;

  @ApiProperty()
  terminalName!: string;

  @ApiProperty()
  teachingDayCount!: number;
}

export class TeachingDaysResponseDto {
  @ApiProperty({ format: 'uuid' })
  schoolId!: string;

  @ApiProperty({ type: [TeachingDaysTerminalCountDto] })
  terminals!: TeachingDaysTerminalCountDto[];
}
