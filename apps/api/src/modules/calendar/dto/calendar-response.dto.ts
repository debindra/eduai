import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export const SCHOOL_CLOSURE_CATEGORIES = ['school_holiday', 'eca', 'cca'] as const;
export type SchoolClosureCategory = (typeof SCHOOL_CLOSURE_CATEGORIES)[number];

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

  @ApiProperty({
    enum: SCHOOL_CLOSURE_CATEGORIES,
    description:
      'school_holiday subtracts from teaching_days; eca/cca are the same event-marker type (ECA Extra Curricular / CCA Co-Curricular) and do not subtract. When schoolActivityId is set, category is taken from the activity kind.',
  })
  @IsEnum(SCHOOL_CLOSURE_CATEGORIES)
  category!: SchoolClosureCategory;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Optional school_eca_cca_items id. When set, category must be eca/cca (or is overwritten from the item).',
  })
  @IsOptional()
  @IsUUID('loose')
  schoolActivityId?: string | null;
}

export class PatchFestivalTemplateDto {
  @ApiProperty({ type: [FestivalClosureDto], description: 'Local/manual school closures only' })
  @IsArray()
  @ArrayMinSize(0)
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

  @ApiProperty({ enum: ['festival_template', 'manual', 'local', 'national'] })
  source!: 'festival_template' | 'manual' | 'local' | 'national';

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  readOnly?: boolean;

  @ApiPropertyOptional({
    enum: [...SCHOOL_CLOSURE_CATEGORIES, 'govt_holiday', 'festival', 'day_off'],
    description: 'School category or national overlay category',
  })
  category?: SchoolClosureCategory | 'govt_holiday' | 'festival' | 'day_off';

  @ApiPropertyOptional({ format: 'uuid', nullable: true, type: String })
  schoolActivityId?: string | null;

  @ApiPropertyOptional({
    description: 'Icon key from linked school ECA/CCA item',
    nullable: true,
    type: String,
  })
  iconKey?: string | null;
}

export class FestivalTemplateResponseDto {
  @ApiProperty({ format: 'uuid' })
  schoolCalendarId!: string;

  @ApiPropertyOptional({
    description: 'Academic year label from the school calendar (e.g. 2082/83)',
  })
  academicYearLabel?: string;

  @ApiPropertyOptional({
    enum: ['draft', 'approved'],
    description: 'Approved calendars are view-only; draft can be patched',
  })
  approvalStatus?: 'draft' | 'approved';

  @ApiPropertyOptional({ description: 'BS year derived from session_start' })
  bsYear?: number;

  @ApiPropertyOptional({ description: 'AD session start (YYYY-MM-DD)' })
  sessionStart?: string;

  @ApiPropertyOptional({ description: 'AD session end (YYYY-MM-DD)' })
  sessionEnd?: string;

  @ApiPropertyOptional({
    type: [Number],
    description: 'ISO weekdays that are weekly offs (1=Mon … 7=Sun)',
    example: [6, 7],
  })
  weeklyOffs?: number[];

  @ApiPropertyOptional({
    type: [FestivalClosureResponseDto],
    description: 'Published national closures (read-only overlay)',
  })
  nationalClosures?: FestivalClosureResponseDto[];

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

  @ApiPropertyOptional({
    description: 'True when this draft was cloned from the live approved calendar',
  })
  clonedFromApproved?: boolean;

  @ApiPropertyOptional({
    description: 'True when an approved calendar is still live for teachers',
  })
  hasLiveApproved?: boolean;
}

export class CalendarStatusResponseDto {
  @ApiProperty({ enum: ['none', 'draft', 'approved'] })
  approvalStatus!: 'none' | 'draft' | 'approved';

  @ApiPropertyOptional({ format: 'uuid' })
  schoolCalendarId?: string;

  @ApiPropertyOptional()
  academicYearLabel?: string;

  @ApiPropertyOptional({
    description: 'True when teachers still see a published approved calendar',
  })
  hasLiveApproved?: boolean;
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

/** National weekly-off preset for school setup (overridable on school calendar). */
export class WeeklyOffPresetResponseDto {
  @ApiProperty({ description: 'BS year the preset was resolved for' })
  bsYear!: number;

  @ApiProperty({
    type: [Number],
    description: 'ISO weekdays (1=Mon … 7=Sun). Defaults to [6] when none published.',
  })
  weeklyOffs!: number[];

  @ApiProperty({ description: 'True when values came from a published national calendar' })
  fromNational!: boolean;
}

export class CalendarViewTerminalDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  startDate!: string;

  @ApiProperty()
  endDate!: string;
}

/** Shared read model for admin / teacher / platform (support session) calendar board. */
export class CalendarViewResponseDto {
  @ApiProperty({ format: 'uuid' })
  schoolId!: string;

  @ApiProperty({ enum: ['none', 'draft', 'approved'] })
  approvalStatus!: 'none' | 'draft' | 'approved';

  @ApiPropertyOptional({ format: 'uuid' })
  schoolCalendarId?: string;

  @ApiPropertyOptional()
  academicYearLabel?: string;

  @ApiPropertyOptional({ description: 'BS year derived from session_start' })
  bsYear?: number;

  @ApiPropertyOptional()
  sessionStart?: string;

  @ApiPropertyOptional()
  sessionEnd?: string;

  @ApiPropertyOptional({
    type: [Number],
    description: 'ISO weekdays that are weekly offs (1=Mon … 7=Sun)',
    example: [6, 7],
  })
  weeklyOffs?: number[];

  @ApiProperty({ type: [FestivalClosureResponseDto] })
  nationalClosures!: FestivalClosureResponseDto[];

  @ApiProperty({ type: [FestivalClosureResponseDto] })
  closures!: FestivalClosureResponseDto[];

  @ApiProperty({ type: [CalendarViewTerminalDto] })
  terminals!: CalendarViewTerminalDto[];
}
