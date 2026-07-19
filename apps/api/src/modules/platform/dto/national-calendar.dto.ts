import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateNationalCalendarDto {
  @ApiProperty({ description: 'Bikram Sambat year, e.g. 2082' })
  @IsInt()
  @Min(2000)
  bsYear!: number;
}

export class UpsertNationalClosureDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Omit to insert' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({ enum: ['govt_holiday', 'festival', 'day_off'] })
  @IsEnum(['govt_holiday', 'festival', 'day_off'])
  category!: 'govt_holiday' | 'festival' | 'day_off';

  @ApiProperty({ format: 'date' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ format: 'date' })
  @IsDateString()
  endDate!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  bsLabel?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  movable?: boolean;
}

export class PatchNationalClosuresDto {
  @ApiProperty({ type: [UpsertNationalClosureDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertNationalClosureDto)
  closures!: UpsertNationalClosureDto[];
}

export class NationalClosureDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ enum: ['govt_holiday', 'festival', 'day_off'] })
  category!: 'govt_holiday' | 'festival' | 'day_off';

  @ApiProperty({ format: 'date' })
  startDate!: string;

  @ApiProperty({ format: 'date' })
  endDate!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  bsLabel!: string | null;

  @ApiProperty()
  movable!: boolean;
}

export class NationalCalendarDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  bsYear!: number;

  @ApiProperty({ enum: ['draft', 'published'] })
  status!: 'draft' | 'published';

  @ApiProperty({ type: [NationalClosureDto] })
  closures!: NationalClosureDto[];
}

export class NationalCalendarsResponseDto {
  @ApiProperty({ type: [NationalCalendarDto] })
  calendars!: NationalCalendarDto[];
}
