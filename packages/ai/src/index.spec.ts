import { describe, expect, it } from 'vitest';
import {
  applyMapperGuards,
  detectSafeguardingSignal,
  isAttendanceNonObservation,
  renderTemplate,
  runValidators,
  selectPedagogy,
  validateNoLabelNoRank,
  validateNoTestLanguage,
} from './index';

describe('renderTemplate', () => {
  it('substitutes named placeholders', () => {
    expect(renderTemplate('Hello {{name}}', { name: 'Aarav' })).toBe('Hello Aarav');
  });
});

describe('validateNoLabelNoRank', () => {
  it('rejects personality terms', () => {
    const result = validateNoLabelNoRank('The child is shy and bright');
    expect(result.ok).toBe(false);
  });

  it('rejects rank language', () => {
    const result = validateNoLabelNoRank('Ranked top of the class');
    expect(result.ok).toBe(false);
  });

  it('accepts plain skill language', () => {
    expect(validateNoLabelNoRank('Counted to ten with blocks').ok).toBe(true);
  });
});

describe('applyMapperGuards', () => {
  it('blocks top-band jump from one sighting', () => {
    const result = applyMapperGuards({
      observationText: 'Did it once',
      ratingCode: 'secure',
    });
    expect(result.ok).toBe(false);
  });

  it('requires roll numbers when name is ambiguous', () => {
    const result = applyMapperGuards({
      observationText: 'Aarav counted',
      childNameAmbiguous: true,
      rollNumberCandidates: [],
    });
    expect(result.ok).toBe(false);
  });

  it('routes non-observation to attendance', () => {
    expect(isAttendanceNonObservation('absent today')).toBe(true);
    const bad = applyMapperGuards({
      observationText: 'absent today',
      routeToAttendance: false,
    });
    expect(bad.ok).toBe(false);
    const good = applyMapperGuards({
      observationText: 'absent today',
      routeToAttendance: true,
    });
    expect(good.ok).toBe(true);
  });
});

describe('selectPedagogy', () => {
  it('uses explicit instruction for letters/numbers', () => {
    expect(selectPedagogy('Letters and sounds')).toBe('explicit_instruction');
    expect(selectPedagogy('Numbers and patterns')).toBe('explicit_instruction');
  });

  it('uses 5E for thematic content', () => {
    expect(selectPedagogy('Animals around us')).toBe('five_e');
  });
});

describe('runValidators', () => {
  it('aggregates validator keys', () => {
    const result = runValidators(['no_label_no_rank', 'no_test_language'], {
      text: 'Timed test for shy child',
    });
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('detects safeguarding signals', () => {
    expect(detectSafeguardingSignal('possible harm to a child')).toBe(true);
  });

  it('rejects test language', () => {
    expect(validateNoTestLanguage('Prepare for the exam').ok).toBe(false);
  });
});
