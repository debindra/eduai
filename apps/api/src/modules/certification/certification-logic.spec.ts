import { describe, expect, it } from 'vitest';
import {
  buildWeekView,
  CERTIFICATION_WEEKS,
  computeCertificationStatus,
  isQuizPass,
  isValidWeek,
  scoreQuiz,
  weekStatusFromScore,
  type WeekProgress,
} from './certification-logic';

describe('certification-logic', () => {
  it('scores a quiz deterministically', () => {
    expect(scoreQuiz(7, 10)).toBe(0.7);
    expect(scoreQuiz(0, 10)).toBe(0);
    expect(scoreQuiz(10, 10)).toBe(1);
    expect(scoreQuiz(5, 0)).toBe(0);
  });

  it('applies the pass threshold', () => {
    expect(isQuizPass(0.7)).toBe(true);
    expect(isQuizPass(0.69)).toBe(false);
    expect(weekStatusFromScore(0.8)).toBe('quiz_passed');
    expect(weekStatusFromScore(0.4)).toBe('quiz_failed');
  });

  it('validates week range', () => {
    expect(isValidWeek(1)).toBe(true);
    expect(isValidWeek(12)).toBe(true);
    expect(isValidWeek(0)).toBe(false);
    expect(isValidWeek(13)).toBe(false);
  });

  it('builds a full 12-week view filling gaps as not_started', () => {
    const view = buildWeekView([{ week: 1, status: 'quiz_passed', quizScore: 0.9 }]);
    expect(view).toHaveLength(CERTIFICATION_WEEKS);
    expect(view[0].status).toBe('quiz_passed');
    expect(view[1].status).toBe('not_started');
  });

  it('is certified only when all weeks pass and observation passes', () => {
    const allPassed: WeekProgress[] = Array.from({ length: 12 }, (_, i) => ({
      week: i + 1,
      status: 'quiz_passed',
      quizScore: 0.9,
    }));
    expect(computeCertificationStatus(allPassed, 'passed')).toBe('certified');
    expect(computeCertificationStatus(allPassed, 'pending')).toBe('in_programme');
  });

  it('is in_programme with partial progress and not_started when empty', () => {
    expect(
      computeCertificationStatus([{ week: 1, status: 'quiz_passed', quizScore: 0.9 }], 'pending'),
    ).toBe('in_programme');
    expect(computeCertificationStatus([], 'pending')).toBe('not_started');
  });
});
