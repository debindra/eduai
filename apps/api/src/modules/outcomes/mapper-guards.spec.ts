import { describe, expect, it } from 'vitest';
import { resolveObservationAgainstRoster } from './mapper-guards';

const roster = [
  { id: 'c1', name: 'Aarav Sharma', rollNumber: '1' },
  { id: 'c2', name: 'Aarav Thapa', rollNumber: '2' },
  { id: 'c3', name: 'Priya Thapa', rollNumber: '3' },
];

describe('mapper guards (shared across capture paths)', () => {
  it('never jumps to top band from one sighting', () => {
    const result = resolveObservationAgainstRoster(
      'Priya counted to five',
      roster,
      'secure',
    );
    expect(result.suggestedRating).toBe('emerging');
    expect(result.blockedReason).toMatch(/top band/i);
  });

  it('ambiguous names return roll numbers, never a guess', () => {
    const result = resolveObservationAgainstRoster('Aarav counted', roster, 'emerging');
    expect(result.childId).toBeNull();
    expect(result.nameAmbiguous).toBe(true);
    expect(result.rollNumberCandidates).toEqual(['1', '2']);
  });

  it('non-observation routes to attendance', () => {
    const result = resolveObservationAgainstRoster('absent today', roster, 'emerging');
    expect(result.routeToAttendance).toBe(true);
    expect(result.childId).toBeNull();
  });

  it('resolves unique name to child without writing', () => {
    const result = resolveObservationAgainstRoster(
      'Priya sorted blocks',
      roster,
      'developing',
    );
    expect(result.childId).toBe('c3');
    expect(result.routeToAttendance).toBe(false);
  });
});
