import { describe, expect, it } from 'vitest';
import {
  certificationStatusLabel,
  observationStatusLabel,
  progressSummary,
  weekStatusLabel,
  type CertificationView,
} from './certification-logic';

const view: CertificationView = {
  teacherId: 't1',
  status: 'in_programme',
  weeks: [
    { week: 1, status: 'quiz_passed', quizScore: 0.9 },
    { week: 2, status: 'quiz_passed', quizScore: 0.8 },
    { week: 3, status: 'not_started', quizScore: null },
  ],
  observation: { status: 'pending', score: null },
};

describe('certification-logic', () => {
  it('labels overall status', () => {
    expect(certificationStatusLabel('certified')).toBe('Certified');
    expect(certificationStatusLabel('in_programme')).toBe('In programme');
  });

  it('labels week + observation status', () => {
    expect(weekStatusLabel('quiz_passed')).toBe('Passed');
    expect(weekStatusLabel('quiz_failed')).toBe('Retry needed');
    expect(observationStatusLabel('pending')).toBe('Awaiting assessor');
  });

  it('summarizes passed weeks out of total', () => {
    expect(progressSummary(view)).toBe('2 / 3 weeks passed');
  });
});
