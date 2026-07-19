import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateTeacherSectionDto } from './roster.dto';

/** Seed-style ids: UUID shape without RFC version/variant bits. */
const SEED_TEACHER_ID = '55555555-5555-5555-5555-555555555551';
const SEED_SECTION_ID = '66666666-6666-6666-6666-666666666601';
const SEED_SUBJECT_ID = 'd1111111-1111-1111-1111-111111111111';

describe('CreateTeacherSectionDto', () => {
  it('accepts seed-style loose UUIDs with a subject', async () => {
    const dto = plainToInstance(CreateTeacherSectionDto, {
      teacherId: SEED_TEACHER_ID,
      sectionId: SEED_SECTION_ID,
      subjectId: SEED_SUBJECT_ID,
      isClassTeacher: false,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('accepts null subjectId for pre-primary grain', async () => {
    const dto = plainToInstance(CreateTeacherSectionDto, {
      teacherId: SEED_TEACHER_ID,
      sectionId: SEED_SECTION_ID,
      subjectId: null,
      isClassTeacher: true,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('rejects non-UUID teacherId', async () => {
    const dto = plainToInstance(CreateTeacherSectionDto, {
      teacherId: 'not-a-uuid',
      sectionId: SEED_SECTION_ID,
      subjectId: null,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'teacherId')).toBe(true);
  });
});
