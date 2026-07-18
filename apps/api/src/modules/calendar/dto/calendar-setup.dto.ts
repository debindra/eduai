import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class TerminalSetupDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  sortOrder!: number;

  @ApiProperty({ example: '2025-04-14' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2025-07-15' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ enum: ['formative', 'summative', 'transition'] })
  @IsIn(['formative', 'summative', 'transition'])
  reportingType!: 'formative' | 'summative' | 'transition';
}

export class CalendarSetupDto {
  @ApiProperty({ example: '2082/83' })
  @IsString()
  @IsNotEmpty()
  academicYearLabel!: string;

  @ApiProperty({ example: '2025-04-14' })
  @IsDateString()
  sessionStart!: string;

  @ApiProperty({ example: '2026-03-31' })
  @IsDateString()
  sessionEnd!: string;

  @ApiProperty({
    type: [Number],
    description: 'ISO day-of-week values excluded from teaching days (1=Mon … 7=Sun)',
    example: [6],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  weeklyOffs!: number[];

  @ApiProperty({ type: [TerminalSetupDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TerminalSetupDto)
  terminals!: TerminalSetupDto[];
}
