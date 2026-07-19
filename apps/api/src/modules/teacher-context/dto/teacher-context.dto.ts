import { ApiProperty } from '@nestjs/swagger';

export class TeacherAssignmentDto {
  @ApiProperty()
  sectionId!: string;

  @ApiProperty()
  sectionName!: string;

  @ApiProperty()
  grade!: string;

  @ApiProperty()
  bandId!: string;

  @ApiProperty({
    description: 'Band-as-data assessment mode — never branch on grade number',
  })
  assessmentMode!: string;

  @ApiProperty({ nullable: true, type: String })
  subjectId!: string | null;

  @ApiProperty({ nullable: true, type: String })
  subjectName!: string | null;

  @ApiProperty()
  isClassTeacher!: boolean;
}

export class TeacherContextResponseDto {
  @ApiProperty()
  teacherId!: string;

  @ApiProperty({ type: [TeacherAssignmentDto] })
  assignments!: TeacherAssignmentDto[];
}
