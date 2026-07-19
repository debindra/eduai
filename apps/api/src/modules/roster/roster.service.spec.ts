import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RosterRepository } from './roster.repository';
import { RosterService } from './roster.service';

const SCHOOL_ID = 'school-1';
const SECTION_ID = 'section-1';
const OTHER_SCHOOL_SECTION = {
  id: 'section-other',
  school_id: 'school-other',
  band_id: 'band-pp',
  grade: 'Nursery',
  name: 'Other',
};

function getSection(overrides?: Partial<{ band_id: string | null }>) {
  return {
    id: SECTION_ID,
    school_id: SCHOOL_ID,
    band_id: 'band-pp',
    grade: 'Nursery',
    name: 'Nursery A',
    ...overrides,
  };
}

describe('RosterService', () => {
  let service: RosterService;
  let repository: {
    listSections: ReturnType<typeof vi.fn>;
    findSection: ReturnType<typeof vi.fn>;
    insertSection: ReturnType<typeof vi.fn>;
    updateSection: ReturnType<typeof vi.fn>;
    deleteSection: ReturnType<typeof vi.fn>;
    countChildrenInSection: ReturnType<typeof vi.fn>;
    bandExists: ReturnType<typeof vi.fn>;
    listChildren: ReturnType<typeof vi.fn>;
    findChild: ReturnType<typeof vi.fn>;
    findChildByRoll: ReturnType<typeof vi.fn>;
    insertChild: ReturnType<typeof vi.fn>;
    updateChild: ReturnType<typeof vi.fn>;
    listTeacherSections: ReturnType<typeof vi.fn>;
    findTeacherSection: ReturnType<typeof vi.fn>;
    findExistingAssignment: ReturnType<typeof vi.fn>;
    insertTeacherSection: ReturnType<typeof vi.fn>;
    updateTeacherSection: ReturnType<typeof vi.fn>;
    deleteTeacherSection: ReturnType<typeof vi.fn>;
    findTeacherInSchool: ReturnType<typeof vi.fn>;
    getBandSubjects: ReturnType<typeof vi.fn>;
    listTeachers: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    repository = {
      listSections: vi.fn(),
      findSection: vi.fn(),
      insertSection: vi.fn(),
      updateSection: vi.fn(),
      deleteSection: vi.fn(),
      countChildrenInSection: vi.fn(),
      bandExists: vi.fn(),
      listChildren: vi.fn(),
      findChild: vi.fn(),
      findChildByRoll: vi.fn(),
      insertChild: vi.fn(),
      updateChild: vi.fn(),
      listTeacherSections: vi.fn(),
      findTeacherSection: vi.fn(),
      findExistingAssignment: vi.fn(),
      insertTeacherSection: vi.fn(),
      updateTeacherSection: vi.fn(),
      deleteTeacherSection: vi.fn(),
      findTeacherInSchool: vi.fn(),
      getBandSubjects: vi.fn(),
      listTeachers: vi.fn(),
    };
    service = new RosterService(repository as unknown as RosterRepository);
  });

  describe('sections', () => {
    it('creates a section when band exists', async () => {
      repository.bandExists.mockResolvedValue(true);
      repository.insertSection.mockResolvedValue(getSection());

      const actual = await service.createSection(SCHOOL_ID, {
        name: 'Nursery A',
        bandId: 'band-pp',
        grade: 'Nursery',
      });

      expect(actual).toEqual({
        id: SECTION_ID,
        schoolId: SCHOOL_ID,
        bandId: 'band-pp',
        grade: 'Nursery',
        name: 'Nursery A',
      });
    });

    it('rejects unknown bandId', async () => {
      repository.bandExists.mockResolvedValue(false);
      await expect(
        service.createSection(SCHOOL_ID, { name: 'X', bandId: 'missing' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(repository.insertSection).not.toHaveBeenCalled();
    });

    it('rejects delete when section has children', async () => {
      repository.findSection.mockResolvedValue(getSection());
      repository.countChildrenInSection.mockResolvedValue(3);
      await expect(service.deleteSection(SCHOOL_ID, SECTION_ID)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repository.deleteSection).not.toHaveBeenCalled();
    });

    it('deletes empty section in school', async () => {
      repository.findSection.mockResolvedValue(getSection());
      repository.countChildrenInSection.mockResolvedValue(0);
      repository.deleteSection.mockResolvedValue(undefined);
      const actual = await service.deleteSection(SCHOOL_ID, SECTION_ID);
      expect(actual).toEqual({ deleted: true, sectionId: SECTION_ID });
    });

    it('rejects cross-school section update', async () => {
      repository.findSection.mockResolvedValue(OTHER_SCHOOL_SECTION);
      await expect(
        service.updateSection(SCHOOL_ID, 'section-other', { name: 'Hacked' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('children', () => {
    it('creates a child with unique roll number', async () => {
      repository.findSection.mockResolvedValue(getSection());
      repository.findChildByRoll.mockResolvedValue(null);
      repository.insertChild.mockResolvedValue({
        id: 'child-1',
        section_id: SECTION_ID,
        name: 'Aarav',
        roll_number: '12',
        dob: null,
        status: 'active',
        report_language_override: null,
        access_note: null,
      });

      const actual = await service.createChild(SCHOOL_ID, {
        sectionId: SECTION_ID,
        name: 'Aarav',
        rollNumber: '12',
      });

      expect(actual.rollNumber).toBe('12');
      expect(actual.name).toBe('Aarav');
    });

    it('rejects duplicate roll number in section', async () => {
      repository.findSection.mockResolvedValue(getSection());
      repository.findChildByRoll.mockResolvedValue({
        id: 'existing',
        section_id: SECTION_ID,
        name: 'Other',
        roll_number: '12',
        dob: null,
        status: 'active',
        report_language_override: null,
        access_note: null,
      });

      await expect(
        service.createChild(SCHOOL_ID, {
          sectionId: SECTION_ID,
          name: 'Aarav',
          rollNumber: '12',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('updates child status lifecycle', async () => {
      repository.findChild.mockResolvedValue({
        id: 'child-1',
        section_id: SECTION_ID,
        name: 'Aarav',
        roll_number: '12',
        dob: null,
        status: 'active',
        report_language_override: null,
        access_note: null,
        school_id: SCHOOL_ID,
      });
      repository.updateChild.mockResolvedValue({
        id: 'child-1',
        section_id: SECTION_ID,
        name: 'Aarav',
        roll_number: '12',
        dob: null,
        status: 'promoted',
        report_language_override: null,
        access_note: null,
      });

      const actual = await service.updateChildStatus(SCHOOL_ID, 'child-1', {
        status: 'promoted',
      });
      expect(actual.status).toBe('promoted');
    });

    it('rejects child create for section in another school', async () => {
      repository.findSection.mockResolvedValue(OTHER_SCHOOL_SECTION);
      await expect(
        service.createChild(SCHOOL_ID, {
          sectionId: 'section-other',
          name: 'X',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('teacher sections', () => {
    it('assigns teacher with null subject when band has no subjects', async () => {
      repository.findSection.mockResolvedValue(getSection({ band_id: 'band-pp' }));
      repository.findTeacherInSchool.mockResolvedValue({ id: 'teacher-1' });
      repository.getBandSubjects.mockResolvedValue({
        bandId: 'band-pp',
        subjectIds: [],
      });
      repository.findExistingAssignment.mockResolvedValue(null);
      repository.insertTeacherSection.mockResolvedValue({
        id: 'ts-1',
        teacher_id: 'teacher-1',
        section_id: SECTION_ID,
        subject_id: null,
        is_class_teacher: true,
      });

      const actual = await service.createTeacherSection(SCHOOL_ID, {
        teacherId: 'teacher-1',
        sectionId: SECTION_ID,
        subjectId: null,
        isClassTeacher: true,
      });

      expect(actual.subjectId).toBeNull();
      expect(actual.isClassTeacher).toBe(true);
    });

    it('rejects non-null subjectId for band with no subjects', async () => {
      repository.findSection.mockResolvedValue(getSection({ band_id: 'band-pp' }));
      repository.findTeacherInSchool.mockResolvedValue({ id: 'teacher-1' });
      repository.getBandSubjects.mockResolvedValue({
        bandId: 'band-pp',
        subjectIds: [],
      });

      await expect(
        service.createTeacherSection(SCHOOL_ID, {
          teacherId: 'teacher-1',
          sectionId: SECTION_ID,
          subjectId: 'subj-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('requires subjectId for band with band_subjects', async () => {
      repository.findSection.mockResolvedValue(
        getSection({ band_id: 'band-early' }),
      );
      repository.findTeacherInSchool.mockResolvedValue({ id: 'teacher-1' });
      repository.getBandSubjects.mockResolvedValue({
        bandId: 'band-early',
        subjectIds: ['subj-math'],
      });

      await expect(
        service.createTeacherSection(SCHOOL_ID, {
          teacherId: 'teacher-1',
          sectionId: SECTION_ID,
          subjectId: null,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects subjectId not in band_subjects', async () => {
      repository.findSection.mockResolvedValue(
        getSection({ band_id: 'band-early' }),
      );
      repository.findTeacherInSchool.mockResolvedValue({ id: 'teacher-1' });
      repository.getBandSubjects.mockResolvedValue({
        bandId: 'band-early',
        subjectIds: ['subj-math'],
      });

      await expect(
        service.createTeacherSection(SCHOOL_ID, {
          teacherId: 'teacher-1',
          sectionId: SECTION_ID,
          subjectId: 'subj-other',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects duplicate assignment grain', async () => {
      repository.findSection.mockResolvedValue(getSection());
      repository.findTeacherInSchool.mockResolvedValue({ id: 'teacher-1' });
      repository.getBandSubjects.mockResolvedValue({
        bandId: 'band-pp',
        subjectIds: [],
      });
      repository.findExistingAssignment.mockResolvedValue({
        id: 'ts-existing',
        teacher_id: 'teacher-1',
        section_id: SECTION_ID,
        subject_id: null,
        is_class_teacher: false,
      });

      await expect(
        service.createTeacherSection(SCHOOL_ID, {
          teacherId: 'teacher-1',
          sectionId: SECTION_ID,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates assignment when subject is in band_subjects', async () => {
      repository.findSection.mockResolvedValue(
        getSection({ band_id: 'band-early' }),
      );
      repository.findTeacherInSchool.mockResolvedValue({ id: 'teacher-1' });
      repository.getBandSubjects.mockResolvedValue({
        bandId: 'band-early',
        subjectIds: ['subj-math'],
      });
      repository.findExistingAssignment.mockResolvedValue(null);
      repository.insertTeacherSection.mockResolvedValue({
        id: 'ts-2',
        teacher_id: 'teacher-1',
        section_id: SECTION_ID,
        subject_id: 'subj-math',
        is_class_teacher: false,
      });

      const actual = await service.createTeacherSection(SCHOOL_ID, {
        teacherId: 'teacher-1',
        sectionId: SECTION_ID,
        subjectId: 'subj-math',
      });
      expect(actual.subjectId).toBe('subj-math');
    });
  });

  describe('listTeachers', () => {
    it('maps teacher roster rows', async () => {
      repository.listTeachers.mockResolvedValue([
        {
          teacher_id: 't1',
          identity_id: 'i1',
          display_name: 'Maya',
          email: 'maya@schoolx.dev',
          phone: null,
          account_status: 'invited',
        },
      ]);
      const actual = await service.listTeachers(SCHOOL_ID);
      expect(actual).toEqual([
        {
          teacherId: 't1',
          identityId: 'i1',
          displayName: 'Maya',
          email: 'maya@schoolx.dev',
          phone: null,
          accountStatus: 'invited',
        },
      ]);
    });
  });
});
