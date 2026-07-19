import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service';

export interface SectionRow {
  id: string;
  school_id: string;
  band_id: string | null;
  grade: string | null;
  name: string;
}

export interface ChildRow {
  id: string;
  section_id: string;
  name: string;
  roll_number: string | null;
  dob: string | null;
  status: 'active' | 'promoted' | 'transferred' | 'exited';
  report_language_override: string | null;
  access_note: string | null;
}

export interface TeacherSectionRow {
  id: string;
  teacher_id: string;
  section_id: string;
  subject_id: string | null;
  is_class_teacher: boolean;
}

export interface TeacherRosterRow {
  teacher_id: string;
  identity_id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  account_status: 'invited' | 'active' | 'disabled';
}

export interface BandSubjectInfo {
  bandId: string;
  subjectIds: string[];
}

const SECTION_SELECT = 'id, school_id, band_id, grade, name';
const CHILD_SELECT =
  'id, section_id, name, roll_number, dob, status, report_language_override, access_note';
const TEACHER_SECTION_SELECT =
  'id, teacher_id, section_id, subject_id, is_class_teacher';

@Injectable()
export class RosterRepository {
  constructor(private readonly supabase: SupabaseService) {}

  private client() {
    const client = this.supabase.getClient();
    if (!client) {
      throw new Error('Database is not configured');
    }
    return client;
  }

  // -------------------------------------------------------------------------
  // Sections
  // -------------------------------------------------------------------------

  async listSections(schoolId: string): Promise<SectionRow[]> {
    const { data, error } = await this.client()
      .from('sections')
      .select(SECTION_SELECT)
      .eq('school_id', schoolId)
      .order('name', { ascending: true });
    if (error) {
      throw new Error(error.message);
    }
    return (data as SectionRow[]) ?? [];
  }

  async findSection(sectionId: string): Promise<SectionRow | null> {
    const { data, error } = await this.client()
      .from('sections')
      .select(SECTION_SELECT)
      .eq('id', sectionId)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return (data as SectionRow | null) ?? null;
  }

  async insertSection(input: {
    schoolId: string;
    name: string;
    bandId: string;
    grade?: string | null;
  }): Promise<SectionRow> {
    const { data, error } = await this.client()
      .from('sections')
      .insert({
        school_id: input.schoolId,
        name: input.name,
        band_id: input.bandId,
        grade: input.grade ?? null,
      })
      .select(SECTION_SELECT)
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create section');
    }
    return data as SectionRow;
  }

  async updateSection(
    sectionId: string,
    patch: { name?: string; bandId?: string; grade?: string | null },
  ): Promise<SectionRow> {
    const update: Record<string, unknown> = {};
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.bandId !== undefined) update.band_id = patch.bandId;
    if (patch.grade !== undefined) update.grade = patch.grade;
    const { data, error } = await this.client()
      .from('sections')
      .update(update)
      .eq('id', sectionId)
      .select(SECTION_SELECT)
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to update section');
    }
    return data as SectionRow;
  }

  async deleteSection(sectionId: string): Promise<void> {
    const { error } = await this.client().from('sections').delete().eq('id', sectionId);
    if (error) {
      throw new Error(error.message);
    }
  }

  async countChildrenInSection(sectionId: string): Promise<number> {
    const { count, error } = await this.client()
      .from('children')
      .select('id', { count: 'exact', head: true })
      .eq('section_id', sectionId);
    if (error) {
      throw new Error(error.message);
    }
    return count ?? 0;
  }

  async bandExists(bandId: string): Promise<boolean> {
    const { data, error } = await this.client()
      .from('bands')
      .select('id')
      .eq('id', bandId)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return data !== null;
  }

  // -------------------------------------------------------------------------
  // Children
  // -------------------------------------------------------------------------

  async listChildren(schoolId: string, sectionId?: string): Promise<ChildRow[]> {
    let query = this.client()
      .from('children')
      .select(`${CHILD_SELECT}, sections!inner(school_id)`)
      .eq('sections.school_id', schoolId)
      .order('roll_number', { ascending: true });
    if (sectionId) {
      query = query.eq('section_id', sectionId);
    }
    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }
    return ((data as Array<ChildRow & { sections?: unknown }>) ?? []).map((row) => ({
      id: row.id,
      section_id: row.section_id,
      name: row.name,
      roll_number: row.roll_number,
      dob: row.dob,
      status: row.status,
      report_language_override: row.report_language_override,
      access_note: row.access_note,
    }));
  }

  async findChild(childId: string): Promise<(ChildRow & { school_id: string }) | null> {
    const { data, error } = await this.client()
      .from('children')
      .select(`${CHILD_SELECT}, sections!inner(school_id)`)
      .eq('id', childId)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    if (!data) return null;
    const row = data as ChildRow & { sections: { school_id: string } | { school_id: string }[] };
    const schoolId = Array.isArray(row.sections)
      ? row.sections[0]?.school_id
      : row.sections.school_id;
    return {
      id: row.id,
      section_id: row.section_id,
      name: row.name,
      roll_number: row.roll_number,
      dob: row.dob,
      status: row.status,
      report_language_override: row.report_language_override,
      access_note: row.access_note,
      school_id: schoolId ?? '',
    };
  }

  async findChildByRoll(
    sectionId: string,
    rollNumber: string,
  ): Promise<ChildRow | null> {
    const { data, error } = await this.client()
      .from('children')
      .select(CHILD_SELECT)
      .eq('section_id', sectionId)
      .eq('roll_number', rollNumber)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return (data as ChildRow | null) ?? null;
  }

  async insertChild(input: {
    sectionId: string;
    name: string;
    rollNumber?: string | null;
    dob?: string | null;
    reportLanguageOverride?: string | null;
    accessNote?: string | null;
  }): Promise<ChildRow> {
    const { data, error } = await this.client()
      .from('children')
      .insert({
        section_id: input.sectionId,
        name: input.name,
        roll_number: input.rollNumber ?? null,
        dob: input.dob ?? null,
        report_language_override: input.reportLanguageOverride ?? null,
        access_note: input.accessNote ?? null,
        status: 'active',
      })
      .select(CHILD_SELECT)
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create child');
    }
    return data as ChildRow;
  }

  async updateChild(
    childId: string,
    patch: {
      name?: string;
      sectionId?: string;
      rollNumber?: string | null;
      dob?: string | null;
      reportLanguageOverride?: string | null;
      accessNote?: string | null;
      status?: ChildRow['status'];
    },
  ): Promise<ChildRow> {
    const update: Record<string, unknown> = {};
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.sectionId !== undefined) update.section_id = patch.sectionId;
    if (patch.rollNumber !== undefined) update.roll_number = patch.rollNumber;
    if (patch.dob !== undefined) update.dob = patch.dob;
    if (patch.reportLanguageOverride !== undefined) {
      update.report_language_override = patch.reportLanguageOverride;
    }
    if (patch.accessNote !== undefined) update.access_note = patch.accessNote;
    if (patch.status !== undefined) update.status = patch.status;
    const { data, error } = await this.client()
      .from('children')
      .update(update)
      .eq('id', childId)
      .select(CHILD_SELECT)
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to update child');
    }
    return data as ChildRow;
  }

  // -------------------------------------------------------------------------
  // Teacher sections
  // -------------------------------------------------------------------------

  async listTeacherSections(
    schoolId: string,
    sectionId?: string,
  ): Promise<TeacherSectionRow[]> {
    let query = this.client()
      .from('teacher_sections')
      .select(`${TEACHER_SECTION_SELECT}, sections!inner(school_id)`)
      .eq('sections.school_id', schoolId)
      .order('created_at', { ascending: true });
    if (sectionId) {
      query = query.eq('section_id', sectionId);
    }
    const { data, error } = await query;
    if (error) {
      throw new Error(error.message);
    }
    return ((data as Array<TeacherSectionRow & { sections?: unknown }>) ?? []).map(
      (row) => ({
        id: row.id,
        teacher_id: row.teacher_id,
        section_id: row.section_id,
        subject_id: row.subject_id,
        is_class_teacher: row.is_class_teacher,
      }),
    );
  }

  async findTeacherSection(
    assignmentId: string,
  ): Promise<(TeacherSectionRow & { school_id: string }) | null> {
    const { data, error } = await this.client()
      .from('teacher_sections')
      .select(`${TEACHER_SECTION_SELECT}, sections!inner(school_id)`)
      .eq('id', assignmentId)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    if (!data) return null;
    const row = data as TeacherSectionRow & {
      sections: { school_id: string } | { school_id: string }[];
    };
    const schoolId = Array.isArray(row.sections)
      ? row.sections[0]?.school_id
      : row.sections.school_id;
    return {
      id: row.id,
      teacher_id: row.teacher_id,
      section_id: row.section_id,
      subject_id: row.subject_id,
      is_class_teacher: row.is_class_teacher,
      school_id: schoolId ?? '',
    };
  }

  async findExistingAssignment(
    teacherId: string,
    sectionId: string,
    subjectId: string | null,
  ): Promise<TeacherSectionRow | null> {
    let query = this.client()
      .from('teacher_sections')
      .select(TEACHER_SECTION_SELECT)
      .eq('teacher_id', teacherId)
      .eq('section_id', sectionId);
    if (subjectId === null) {
      query = query.is('subject_id', null);
    } else {
      query = query.eq('subject_id', subjectId);
    }
    const { data, error } = await query.maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return (data as TeacherSectionRow | null) ?? null;
  }

  async insertTeacherSection(input: {
    teacherId: string;
    sectionId: string;
    subjectId: string | null;
    isClassTeacher: boolean;
  }): Promise<TeacherSectionRow> {
    const { data, error } = await this.client()
      .from('teacher_sections')
      .insert({
        teacher_id: input.teacherId,
        section_id: input.sectionId,
        subject_id: input.subjectId,
        is_class_teacher: input.isClassTeacher,
      })
      .select(TEACHER_SECTION_SELECT)
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create teacher assignment');
    }
    return data as TeacherSectionRow;
  }

  async updateTeacherSection(
    assignmentId: string,
    patch: { isClassTeacher?: boolean },
  ): Promise<TeacherSectionRow> {
    const update: Record<string, unknown> = {};
    if (patch.isClassTeacher !== undefined) {
      update.is_class_teacher = patch.isClassTeacher;
    }
    const { data, error } = await this.client()
      .from('teacher_sections')
      .update(update)
      .eq('id', assignmentId)
      .select(TEACHER_SECTION_SELECT)
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to update teacher assignment');
    }
    return data as TeacherSectionRow;
  }

  async deleteTeacherSection(assignmentId: string): Promise<void> {
    const { error } = await this.client()
      .from('teacher_sections')
      .delete()
      .eq('id', assignmentId);
    if (error) {
      throw new Error(error.message);
    }
  }

  async findTeacherInSchool(
    teacherId: string,
    schoolId: string,
  ): Promise<{ id: string } | null> {
    const { data, error } = await this.client()
      .from('teachers')
      .select('id, school_memberships!inner(school_id, member_type, status)')
      .eq('id', teacherId)
      .eq('school_memberships.school_id', schoolId)
      .eq('school_memberships.member_type', 'teacher')
      .eq('school_memberships.status', 'active')
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return data ? { id: (data as { id: string }).id } : null;
  }

  /**
   * Band-as-data: subjects allowed for a band come from band_subjects rows.
   * Empty list → pre-primary style (subject_id must be NULL).
   */
  async getBandSubjects(bandId: string): Promise<BandSubjectInfo> {
    const { data, error } = await this.client()
      .from('band_subjects')
      .select('subject_id')
      .eq('band_id', bandId);
    if (error) {
      throw new Error(error.message);
    }
    const subjectIds = ((data as Array<{ subject_id: string }>) ?? []).map(
      (row) => row.subject_id,
    );
    return { bandId, subjectIds };
  }

  // -------------------------------------------------------------------------
  // Teachers roster
  // -------------------------------------------------------------------------

  async listTeachers(schoolId: string): Promise<TeacherRosterRow[]> {
    const { data, error } = await this.client()
      .from('teachers')
      .select(
        `
        id,
        display_name,
        school_memberships!inner(
          identity_id,
          school_id,
          member_type,
          status,
          identities!inner(email, phone, account_status)
        )
      `,
      )
      .eq('school_memberships.school_id', schoolId)
      .eq('school_memberships.member_type', 'teacher')
      .eq('school_memberships.status', 'active');
    if (error) {
      throw new Error(error.message);
    }

    type Nested = {
      id: string;
      display_name: string | null;
      school_memberships:
        | {
            identity_id: string;
            identities:
              | { email: string | null; phone: string | null; account_status: string }
              | Array<{ email: string | null; phone: string | null; account_status: string }>;
          }
        | Array<{
            identity_id: string;
            identities:
              | { email: string | null; phone: string | null; account_status: string }
              | Array<{ email: string | null; phone: string | null; account_status: string }>;
          }>;
    };

    const rows = (data as Nested[]) ?? [];
    return rows.map((row) => {
      const membership = Array.isArray(row.school_memberships)
        ? row.school_memberships[0]
        : row.school_memberships;
      const identity = Array.isArray(membership?.identities)
        ? membership.identities[0]
        : membership?.identities;
      return {
        teacher_id: row.id,
        identity_id: membership?.identity_id ?? '',
        display_name: row.display_name,
        email: identity?.email ?? null,
        phone: identity?.phone ?? null,
        account_status: (identity?.account_status ?? 'invited') as TeacherRosterRow['account_status'],
      };
    });
  }
}
