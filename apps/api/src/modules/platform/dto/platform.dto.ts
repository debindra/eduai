import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  MinLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/** Trim strings; blank → undefined so @IsOptional skips further checks. */
function trimToUndefined({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

@ValidatorConstraint({ name: 'adminContactXor', async: false })
export class AdminContactXorConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const dto = args.object as CreatePlatformSchoolDto;
    const hasEmail = Boolean(dto.adminEmail);
    const hasPhone = Boolean(dto.adminPhone);
    return (hasEmail || hasPhone) && !(hasEmail && hasPhone);
  }

  defaultMessage(): string {
    return 'Provide adminEmail or adminPhone, not both';
  }
}

export class CreateSupportSessionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('loose')
  schoolId!: string;

  @ApiProperty({ minLength: 3 })
  @IsString()
  @MinLength(3)
  reason!: string;

  @ApiPropertyOptional({ description: 'Who granted consent (name or note)' })
  @IsOptional()
  @IsString()
  grantedBy?: string;

  @ApiPropertyOptional({
    description: 'Hours until expiry (default 4, max 72)',
    default: 4,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(72)
  expiresInHours?: number;
}

export class CreatePlatformSchoolDto {
  @ApiProperty({ minLength: 1 })
  @Transform(trimToUndefined)
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiPropertyOptional()
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  tier?: string;

  @ApiPropertyOptional({ description: 'e.g. pre_primary,basic_early,basic_upper' })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  licensedBandRange?: string;

  @ApiPropertyOptional({ description: 'First admin email — omit for mobile-only' })
  @Validate(AdminContactXorConstraint)
  @Transform(trimToUndefined)
  @IsOptional()
  @IsEmail()
  adminEmail?: string;

  @ApiPropertyOptional({ description: 'First admin phone — omit for email' })
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  @MinLength(1)
  adminPhone?: string;

  @ApiPropertyOptional()
  @Transform(trimToUndefined)
  @IsOptional()
  @IsString()
  adminDisplayName?: string;
}

export class PlatformSchoolDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  region!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  tier!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  licensedBandRange!: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  exitStatus!: string | null;

  @ApiProperty({ enum: ['none', 'draft', 'approved'] })
  calendarStatus!: 'none' | 'draft' | 'approved';

  @ApiProperty({ description: 'Total sections in the school' })
  sectionsTotal!: number;

  @ApiProperty({
    description:
      'Sections with no approved calendar or zero teaching days — shape only, no names',
  })
  sectionsBehind!: number;

  @ApiProperty({ description: 'Active teacher memberships — count only' })
  teachersTotal!: number;

  @ApiProperty({ description: 'Enrolled children — count only, no names' })
  studentsTotal!: number;

  @ApiProperty({
    description: 'Distinct subjects assigned via teacher_sections — count only',
  })
  subjectsTotal!: number;
}

export class PlatformSchoolAdminInviteDto {
  @ApiProperty({ format: 'uuid' })
  identityId!: string;

  @ApiProperty({ enum: ['email', 'mobile'] })
  delivery!: 'email' | 'mobile';
}

export class CreatePlatformSchoolResponseDto {
  @ApiProperty({ type: PlatformSchoolDto })
  school!: PlatformSchoolDto;

  @ApiProperty({ type: PlatformSchoolAdminInviteDto })
  admin!: PlatformSchoolAdminInviteDto;
}

export class PlatformSchoolsResponseDto {
  @ApiProperty({ type: [PlatformSchoolDto] })
  schools!: PlatformSchoolDto[];
}

export class SupportSessionDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  schoolId!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  schoolName!: string | null;

  @ApiProperty()
  reason!: string;

  @ApiPropertyOptional({ nullable: true, type: String })
  grantedBy!: string | null;

  @ApiProperty()
  startsAt!: string;

  @ApiProperty()
  expiresAt!: string;

  @ApiProperty({ enum: ['pending', 'active', 'expired', 'revoked'] })
  status!: 'pending' | 'active' | 'expired' | 'revoked';
}

export class SupportSessionsResponseDto {
  @ApiProperty({ type: [SupportSessionDto] })
  sessions!: SupportSessionDto[];
}
