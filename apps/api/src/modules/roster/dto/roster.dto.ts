import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------

export class CreateSectionDto {
  @ApiProperty({ example: 'Nursery A' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ format: 'uuid', description: 'Band this section belongs to' })
  @IsUUID('loose')
  bandId!: string;

  @ApiPropertyOptional({ example: 'Nursery' })
  @IsOptional()
  @IsString()
  grade?: string;
}

export class UpdateSectionDto {
  @ApiPropertyOptional({ example: 'Nursery A' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('loose')
  bandId?: string;

  @ApiPropertyOptional({ example: 'Nursery' })
  @IsOptional()
  @IsString()
  grade?: string;
}

export class SectionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  schoolId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  bandId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  grade!: string | null;

  @ApiProperty()
  name!: string;
}

// ---------------------------------------------------------------------------
// Children
// ---------------------------------------------------------------------------

export class CreateChildDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('loose')
  sectionId!: string;

  @ApiProperty({ example: 'Aarav Sharma' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiPropertyOptional({ example: '12' })
  @IsOptional()
  @IsString()
  rollNumber?: string;

  @ApiPropertyOptional({ example: '2019-05-14', description: 'ISO date' })
  @IsOptional()
  @IsString()
  dob?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reportLanguageOverride?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessNote?: string;
}

export class UpdateChildDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID('loose')
  sectionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rollNumber?: string;

  @ApiPropertyOptional({ example: '2019-05-14' })
  @IsOptional()
  @IsString()
  dob?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reportLanguageOverride?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessNote?: string;
}

export class UpdateChildStatusDto {
  @ApiProperty({ enum: ['active', 'promoted', 'transferred', 'exited'] })
  @IsIn(['active', 'promoted', 'transferred', 'exited'])
  status!: 'active' | 'promoted' | 'transferred' | 'exited';
}

export class ChildResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  sectionId!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  rollNumber!: string | null;

  @ApiPropertyOptional({ nullable: true })
  dob!: string | null;

  @ApiProperty({ enum: ['active', 'promoted', 'transferred', 'exited'] })
  status!: 'active' | 'promoted' | 'transferred' | 'exited';

  @ApiPropertyOptional({ nullable: true })
  reportLanguageOverride!: string | null;

  @ApiPropertyOptional({ nullable: true })
  accessNote!: string | null;
}

// ---------------------------------------------------------------------------
// Teacher sections (assignments)
// ---------------------------------------------------------------------------

export class CreateTeacherSectionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('loose')
  teacherId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID('loose')
  sectionId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description: 'NULL at pre-primary; required subject from band_subjects for Grades 1–5',
  })
  @IsOptional()
  @IsUUID('loose')
  subjectId?: string | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isClassTeacher?: boolean;
}

export class UpdateTeacherSectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isClassTeacher?: boolean;
}

export class TeacherSectionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  teacherId!: string;

  @ApiProperty({ format: 'uuid' })
  sectionId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  subjectId!: string | null;

  @ApiProperty()
  isClassTeacher!: boolean;
}

// ---------------------------------------------------------------------------
// Teachers roster
// ---------------------------------------------------------------------------

export class TeacherRosterItemDto {
  @ApiProperty({ format: 'uuid' })
  teacherId!: string;

  @ApiProperty({ format: 'uuid' })
  identityId!: string;

  @ApiPropertyOptional({ nullable: true })
  displayName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;

  @ApiProperty({ enum: ['invited', 'active', 'disabled'] })
  accountStatus!: 'invited' | 'active' | 'disabled';
}
