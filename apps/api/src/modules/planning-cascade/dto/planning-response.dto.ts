import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MonthlyDayDto {
  @ApiProperty({ example: '2025-05-04' })
  date!: string;

  @ApiProperty()
  teachingDayIndex!: number;

  @ApiPropertyOptional({ nullable: true })
  themeOrChapter!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  mapSliceId!: string | null;
}

export class MonthlyPlanResponseDto {
  @ApiProperty({ format: 'uuid' })
  sectionId!: string;

  @ApiProperty()
  year!: number;

  @ApiProperty()
  month!: number;

  @ApiProperty({ type: [MonthlyDayDto] })
  days!: MonthlyDayDto[];
}

export class WeeklyDayDto extends MonthlyDayDto {
  @ApiProperty({ description: 'True when a teacher Sunday-adjust override exists for this day' })
  overridden!: boolean;

  @ApiPropertyOptional({ nullable: true })
  notes!: string | null;
}

export class WeeklyPlanResponseDto {
  @ApiProperty({ format: 'uuid' })
  sectionId!: string;

  @ApiProperty({ example: '2025-05-04', description: 'Sunday start of the week' })
  weekStart!: string;

  @ApiProperty({ type: [WeeklyDayDto] })
  days!: WeeklyDayDto[];
}

export class DailyPlanResponseDto extends WeeklyDayDto {
  @ApiProperty({ format: 'uuid' })
  sectionId!: string;
}
