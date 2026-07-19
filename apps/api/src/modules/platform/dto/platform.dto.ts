import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';

export class CreateSupportSessionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
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

  @ApiProperty({ description: 'Total sections in the school' })
  sectionsTotal!: number;

  @ApiProperty({
    description:
      'Sections with no approved calendar or zero teaching days — shape only, no names',
  })
  sectionsBehind!: number;
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
