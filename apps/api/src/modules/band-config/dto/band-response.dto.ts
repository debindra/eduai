import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GradeScaleResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  labelEn!: string;

  @ApiPropertyOptional({ nullable: true })
  labelNp!: string | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiPropertyOptional({ nullable: true })
  numericValue!: number | null;
}

export class SubjectResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  nameEn!: string;

  @ApiPropertyOptional({ nullable: true })
  nameNp!: string | null;

  @ApiProperty()
  sortOrder!: number;
}

export class BandResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  nameEn!: string;

  @ApiPropertyOptional({ nullable: true })
  nameNp!: string | null;

  @ApiProperty()
  assessmentMode!: string;

  @ApiPropertyOptional({ nullable: true })
  aggregationRule!: string | null;

  @ApiPropertyOptional({ nullable: true })
  gradeRange!: string | null;

  @ApiProperty({ type: [GradeScaleResponseDto] })
  gradeScales!: GradeScaleResponseDto[];

  @ApiProperty({ type: [SubjectResponseDto] })
  subjects!: SubjectResponseDto[];
}

export class BandsListResponseDto {
  @ApiProperty({ type: [BandResponseDto] })
  bands!: BandResponseDto[];
}
