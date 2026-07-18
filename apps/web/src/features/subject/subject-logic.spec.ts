import { describe, expect, it } from 'vitest';
import { oversightHeadline, subjectViewHeadline, type OversightShape, type SubjectViewShape } from './subject-logic';

describe('subject-logic', () => {
  it('summarises subject-teacher view', () => {
    const view: SubjectViewShape = {
      sectionId: 's1',
      subjectId: 'math',
      subjectName: 'Mathematics',
      writeScope: 'subject',
      hasWriteGrain: true,
      outcomes: [{ id: 'o1', code: 'G1-MATH-001', statement: 'Counts' }],
      children: [{ id: 'c1', name: 'Nisha', rollNumber: '1' }],
      confirmedCount: 2,
      confirmed: [],
    };
    expect(subjectViewHeadline(view)).toBe('Mathematics · 2 confirmed · 1 children');
  });

  it('summarises class-teacher oversight without ranking', () => {
    const view: OversightShape = {
      sectionId: 's1',
      sectionName: 'Grade 1 A',
      grade: 'Grade 1',
      children: [
        { childId: 'c1', name: 'Nisha', rollNumber: '1', letterCode: 'B', percent: 70 },
        { childId: 'c2', name: 'Rohan', rollNumber: '2', letterCode: null, percent: null },
      ],
    };
    expect(oversightHeadline(view)).toBe('Grade 1 A · 1/2 with letter grade');
  });
});
