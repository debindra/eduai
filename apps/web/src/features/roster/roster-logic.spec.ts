import { describe, expect, it } from 'vitest';
import {
  accountStatusLabel,
  childrenAvailableForSection,
  filterChildrenByName,
  filterTeachersByQuery,
  groupAssignmentsBySection,
  groupChildrenBySection,
  subjectRequiredForBand,
  teacherLabel,
  validateRollNumber,
  validateSubjectForBand,
  type BandShape,
  type ChildShape,
  type TeacherRosterShape,
  type TeacherSectionShape,
} from './roster-logic';

function getMockChild(overrides?: Partial<ChildShape>): ChildShape {
  return {
    id: 'c1',
    sectionId: 's1',
    name: 'Aarav',
    rollNumber: '1',
    dob: null,
    status: 'active',
    reportLanguageOverride: null,
    accessNote: null,
    ...overrides,
  };
}

const prePrimaryBand: BandShape = {
  id: 'band-pp',
  code: 'pre_primary',
  nameEn: 'Pre-primary',
  nameNp: null,
  assessmentMode: 'three_state_narrative',
  aggregationRule: null,
  gradeRange: 'Nursery–UKG',
  subjects: [],
};

const earlyBand: BandShape = {
  id: 'band-early',
  code: 'basic_early',
  nameEn: 'Basic early',
  nameNp: null,
  assessmentMode: 'four_point_scale',
  aggregationRule: 'mean_of_four_percent_letter',
  gradeRange: 'Grade 1–3',
  subjects: [
    { id: 'subj-math', code: 'math', nameEn: 'Mathematics', nameNp: null, sortOrder: 1 },
  ],
};

describe('subjectRequiredForBand', () => {
  it('is false when band has no subjects', () => {
    expect(subjectRequiredForBand(prePrimaryBand)).toBe(false);
  });

  it('is true when band has subjects', () => {
    expect(subjectRequiredForBand(earlyBand)).toBe(true);
  });
});

describe('validateSubjectForBand', () => {
  it('requires null subject for pre-primary-style band', () => {
    expect(validateSubjectForBand(prePrimaryBand, null)).toBeNull();
    expect(validateSubjectForBand(prePrimaryBand, 'subj-math')).toMatch(/no subjects/);
  });

  it('requires a band_subjects subject for early band', () => {
    expect(validateSubjectForBand(earlyBand, null)).toMatch(/required/);
    expect(validateSubjectForBand(earlyBand, 'subj-other')).toMatch(/not configured/);
    expect(validateSubjectForBand(earlyBand, 'subj-math')).toBeNull();
  });
});

describe('validateRollNumber', () => {
  it('allows empty and short rolls', () => {
    expect(validateRollNumber('')).toBeNull();
    expect(validateRollNumber('12')).toBeNull();
  });

  it('rejects overly long rolls', () => {
    expect(validateRollNumber('x'.repeat(40))).toMatch(/too long/);
  });
});

describe('childrenAvailableForSection', () => {
  it('excludes children already in the section and non-active statuses', () => {
    const children = [
      getMockChild({ id: 'c1', sectionId: 's1', name: 'In section' }),
      getMockChild({ id: 'c2', sectionId: 's2', name: 'Elsewhere' }),
      getMockChild({
        id: 'c3',
        sectionId: 's2',
        name: 'Exited',
        status: 'exited',
      }),
    ];
    expect(childrenAvailableForSection(children, 's1').map((c) => c.id)).toEqual([
      'c2',
    ]);
  });
});

describe('filterChildrenByName', () => {
  it('returns no matches for blank query', () => {
    expect(filterChildrenByName([getMockChild()], '  ')).toEqual([]);
  });

  it('matches name substring case-insensitively', () => {
    const children = [
      getMockChild({ id: 'c1', name: 'Aarav Sharma' }),
      getMockChild({ id: 'c2', name: 'Priya' }),
    ];
    expect(filterChildrenByName(children, 'aar').map((c) => c.id)).toEqual(['c1']);
  });
});

describe('filterTeachersByQuery', () => {
  it('matches display name case-insensitively', () => {
    const teachers: TeacherRosterShape[] = [
      {
        teacherId: 't1',
        identityId: 'i1',
        displayName: 'Maya Thapa',
        email: 'maya@schoolx.dev',
        phone: null,
        accountStatus: 'active',
      },
      {
        teacherId: 't2',
        identityId: 'i2',
        displayName: 'Ravi',
        email: null,
        phone: null,
        accountStatus: 'invited',
      },
    ];
    expect(filterTeachersByQuery(teachers, 'may').map((t) => t.teacherId)).toEqual([
      't1',
    ]);
  });
});

describe('grouping helpers', () => {
  it('groups children by section', () => {
    const children: ChildShape[] = [
      {
        id: 'c1',
        sectionId: 's1',
        name: 'A',
        rollNumber: '1',
        dob: null,
        status: 'active',
        reportLanguageOverride: null,
        accessNote: null,
      },
      {
        id: 'c2',
        sectionId: 's2',
        name: 'B',
        rollNumber: null,
        dob: null,
        status: 'active',
        reportLanguageOverride: null,
        accessNote: null,
      },
      {
        id: 'c3',
        sectionId: 's1',
        name: 'C',
        rollNumber: '2',
        dob: null,
        status: 'active',
        reportLanguageOverride: null,
        accessNote: null,
      },
    ];
    const map = groupChildrenBySection(children);
    expect(map.get('s1')).toHaveLength(2);
    expect(map.get('s2')).toHaveLength(1);
  });

  it('groups assignments by section', () => {
    const rows: TeacherSectionShape[] = [
      {
        id: 'a1',
        teacherId: 't1',
        sectionId: 's1',
        subjectId: null,
        isClassTeacher: true,
      },
      {
        id: 'a2',
        teacherId: 't2',
        sectionId: 's1',
        subjectId: 'subj-math',
        isClassTeacher: false,
      },
    ];
    expect(groupAssignmentsBySection(rows).get('s1')).toHaveLength(2);
  });
});

describe('labels', () => {
  it('prefers displayName then email then phone', () => {
    const base: TeacherRosterShape = {
      teacherId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      identityId: 'i1',
      displayName: null,
      email: null,
      phone: null,
      accountStatus: 'invited',
    };
    expect(teacherLabel({ ...base, displayName: 'Maya' })).toBe('Maya');
    expect(teacherLabel({ ...base, email: 'm@x.dev' })).toBe('m@x.dev');
    expect(teacherLabel({ ...base, phone: '9800' })).toBe('9800');
    expect(teacherLabel(base)).toBe('aaaaaaaa');
  });

  it('formats account status', () => {
    expect(accountStatusLabel('invited')).toBe('Invited');
    expect(accountStatusLabel('active')).toBe('Active');
    expect(accountStatusLabel('disabled')).toBe('Disabled');
  });
});
