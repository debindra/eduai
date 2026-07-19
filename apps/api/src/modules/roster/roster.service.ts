import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateChildDto,
  CreateSectionDto,
  CreateTeacherSectionDto,
  UpdateChildDto,
  UpdateChildStatusDto,
  UpdateSectionDto,
  UpdateTeacherSectionDto,
} from './dto/roster.dto';
import type { ChildRow, SectionRow, TeacherSectionRow } from './roster.repository';
import { RosterRepository } from './roster.repository';

@Injectable()
export class RosterService {
  constructor(private readonly repository: RosterRepository) {}

  // -------------------------------------------------------------------------
  // Sections
  // -------------------------------------------------------------------------

  async listSections(schoolId: string) {
    const rows = await this.repository.listSections(schoolId);
    return rows.map((row) => this.mapSection(row));
  }

  async createSection(schoolId: string, dto: CreateSectionDto) {
    const bandOk = await this.repository.bandExists(dto.bandId);
    if (!bandOk) {
      throw new BadRequestException('Unknown bandId');
    }
    const row = await this.repository.insertSection({
      schoolId,
      name: dto.name,
      bandId: dto.bandId,
      grade: dto.grade ?? null,
    });
    return this.mapSection(row);
  }

  async updateSection(schoolId: string, sectionId: string, dto: UpdateSectionDto) {
    await this.requireSectionInSchool(schoolId, sectionId);
    if (dto.bandId !== undefined) {
      const bandOk = await this.repository.bandExists(dto.bandId);
      if (!bandOk) {
        throw new BadRequestException('Unknown bandId');
      }
    }
    const row = await this.repository.updateSection(sectionId, {
      name: dto.name,
      bandId: dto.bandId,
      grade: dto.grade,
    });
    return this.mapSection(row);
  }

  async deleteSection(schoolId: string, sectionId: string) {
    await this.requireSectionInSchool(schoolId, sectionId);
    const childCount = await this.repository.countChildrenInSection(sectionId);
    if (childCount > 0) {
      throw new ConflictException(
        `Cannot delete section with ${childCount} child(ren); reassign or exit children first`,
      );
    }
    await this.repository.deleteSection(sectionId);
    return { deleted: true as const, sectionId };
  }

  // -------------------------------------------------------------------------
  // Children
  // -------------------------------------------------------------------------

  async listChildren(schoolId: string, sectionId?: string) {
    if (sectionId) {
      await this.requireSectionInSchool(schoolId, sectionId);
    }
    const rows = await this.repository.listChildren(schoolId, sectionId);
    return rows.map((row) => this.mapChild(row));
  }

  async createChild(schoolId: string, dto: CreateChildDto) {
    await this.requireSectionInSchool(schoolId, dto.sectionId);
    if (dto.rollNumber) {
      await this.assertRollUnique(dto.sectionId, dto.rollNumber);
    }
    const row = await this.repository.insertChild({
      sectionId: dto.sectionId,
      name: dto.name,
      rollNumber: dto.rollNumber ?? null,
      dob: dto.dob ?? null,
      reportLanguageOverride: dto.reportLanguageOverride ?? null,
      accessNote: dto.accessNote ?? null,
    });
    return this.mapChild(row);
  }

  async updateChild(schoolId: string, childId: string, dto: UpdateChildDto) {
    const existing = await this.requireChildInSchool(schoolId, childId);
    const targetSectionId = dto.sectionId ?? existing.section_id;
    if (dto.sectionId !== undefined && dto.sectionId !== existing.section_id) {
      await this.requireSectionInSchool(schoolId, dto.sectionId);
    }
    const rollNumber =
      dto.rollNumber !== undefined ? dto.rollNumber : existing.roll_number;
    if (rollNumber) {
      const clash = await this.repository.findChildByRoll(targetSectionId, rollNumber);
      if (clash && clash.id !== childId) {
        throw new ConflictException(
          `Roll number ${rollNumber} already exists in this section`,
        );
      }
    }
    const row = await this.repository.updateChild(childId, {
      name: dto.name,
      sectionId: dto.sectionId,
      rollNumber: dto.rollNumber,
      dob: dto.dob,
      reportLanguageOverride: dto.reportLanguageOverride,
      accessNote: dto.accessNote,
    });
    return this.mapChild(row);
  }

  async updateChildStatus(
    schoolId: string,
    childId: string,
    dto: UpdateChildStatusDto,
  ) {
    await this.requireChildInSchool(schoolId, childId);
    const row = await this.repository.updateChild(childId, { status: dto.status });
    return this.mapChild(row);
  }

  // -------------------------------------------------------------------------
  // Teacher sections
  // -------------------------------------------------------------------------

  async listTeacherSections(schoolId: string, sectionId?: string) {
    if (sectionId) {
      await this.requireSectionInSchool(schoolId, sectionId);
    }
    const rows = await this.repository.listTeacherSections(schoolId, sectionId);
    return rows.map((row) => this.mapTeacherSection(row));
  }

  async createTeacherSection(schoolId: string, dto: CreateTeacherSectionDto) {
    const section = await this.requireSectionInSchool(schoolId, dto.sectionId);
    const teacher = await this.repository.findTeacherInSchool(dto.teacherId, schoolId);
    if (!teacher) {
      throw new NotFoundException('Teacher not found in this school');
    }
    const subjectId = dto.subjectId === undefined ? null : dto.subjectId;
    await this.assertSubjectMatchesBand(section, subjectId);

    const existing = await this.repository.findExistingAssignment(
      dto.teacherId,
      dto.sectionId,
      subjectId,
    );
    if (existing) {
      throw new ConflictException(
        'Teacher is already assigned to this section/subject grain',
      );
    }

    const row = await this.repository.insertTeacherSection({
      teacherId: dto.teacherId,
      sectionId: dto.sectionId,
      subjectId,
      isClassTeacher: dto.isClassTeacher ?? false,
    });
    return this.mapTeacherSection(row);
  }

  async updateTeacherSection(
    schoolId: string,
    assignmentId: string,
    dto: UpdateTeacherSectionDto,
  ) {
    await this.requireAssignmentInSchool(schoolId, assignmentId);
    const row = await this.repository.updateTeacherSection(assignmentId, {
      isClassTeacher: dto.isClassTeacher,
    });
    return this.mapTeacherSection(row);
  }

  async deleteTeacherSection(schoolId: string, assignmentId: string) {
    await this.requireAssignmentInSchool(schoolId, assignmentId);
    await this.repository.deleteTeacherSection(assignmentId);
    return { deleted: true as const, assignmentId };
  }

  async listTeachers(schoolId: string) {
    const rows = await this.repository.listTeachers(schoolId);
    return rows.map((row) => ({
      teacherId: row.teacher_id,
      identityId: row.identity_id,
      displayName: row.display_name,
      email: row.email,
      phone: row.phone,
      accountStatus: row.account_status,
    }));
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private async requireSectionInSchool(
    schoolId: string,
    sectionId: string,
  ): Promise<SectionRow> {
    const section = await this.repository.findSection(sectionId);
    if (!section || section.school_id !== schoolId) {
      throw new NotFoundException('Section not found in this school');
    }
    return section;
  }

  private async requireChildInSchool(schoolId: string, childId: string) {
    const child = await this.repository.findChild(childId);
    if (!child || child.school_id !== schoolId) {
      throw new NotFoundException('Child not found in this school');
    }
    return child;
  }

  private async requireAssignmentInSchool(schoolId: string, assignmentId: string) {
    const assignment = await this.repository.findTeacherSection(assignmentId);
    if (!assignment || assignment.school_id !== schoolId) {
      throw new NotFoundException('Assignment not found in this school');
    }
    return assignment;
  }

  private async assertRollUnique(sectionId: string, rollNumber: string) {
    const existing = await this.repository.findChildByRoll(sectionId, rollNumber);
    if (existing) {
      throw new ConflictException(
        `Roll number ${rollNumber} already exists in this section`,
      );
    }
  }

  /**
   * Band-as-data: if the band has band_subjects rows, subjectId must be one of them.
   * If the band has no subjects (pre-primary), subjectId must be NULL.
   * Never branch on grade numbers.
   */
  private async assertSubjectMatchesBand(
    section: SectionRow,
    subjectId: string | null,
  ): Promise<void> {
    if (!section.band_id) {
      throw new BadRequestException(
        'Section has no band; cannot validate subject assignment',
      );
    }
    const { subjectIds } = await this.repository.getBandSubjects(section.band_id);
    if (subjectIds.length === 0) {
      if (subjectId !== null) {
        throw new BadRequestException(
          'This band has no subjects; subjectId must be null (pre-primary grain)',
        );
      }
      return;
    }
    if (subjectId === null) {
      throw new BadRequestException(
        'subjectId is required for this band (must be a band_subjects entry)',
      );
    }
    if (!subjectIds.includes(subjectId)) {
      throw new BadRequestException(
        'subjectId is not configured for this section’s band',
      );
    }
  }

  private mapSection(row: SectionRow) {
    return {
      id: row.id,
      schoolId: row.school_id,
      bandId: row.band_id,
      grade: row.grade,
      name: row.name,
    };
  }

  private mapChild(row: ChildRow) {
    return {
      id: row.id,
      sectionId: row.section_id,
      name: row.name,
      rollNumber: row.roll_number,
      dob: row.dob,
      status: row.status,
      reportLanguageOverride: row.report_language_override,
      accessNote: row.access_note,
    };
  }

  private mapTeacherSection(row: TeacherSectionRow) {
    return {
      id: row.id,
      teacherId: row.teacher_id,
      sectionId: row.section_id,
      subjectId: row.subject_id,
      isClassTeacher: row.is_class_teacher,
    };
  }
}
