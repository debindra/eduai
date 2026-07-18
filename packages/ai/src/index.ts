/** Prompt lookup and output validators — runtime reads `prompts` table rows. */

export const AI_PACKAGE_VERSION = '0.1.0';

export type ModelTier = 'haiku' | 'sonnet' | 'none';

export type ValidatorKey =
  | 'mapper_guards'
  | 'no_label_no_rank'
  | 'safeguarding_precheck'
  | 'grounded_in_slice'
  | 'no_test_language'
  | 'evidence_grounded'
  | 'thin_data_fallback';

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

const PERSONALITY_TRAIT_TERMS =
  /\b(shy|difficult|bright|lazy|aggressive|hyperactive|autistic|adhd|slow learner)\b/i;

const RANK_COMPARISON =
  /\b(rank|ranked|top of (the )?class|bottom of (the )?class|better than|worse than|percentile|%ile)\b/i;

const TEST_EXAM_LANGUAGE = /\b(exam|test score|scored assessment|timed test|marksheet)\b/i;

const ATTENDANCE_NON_OBSERVATION =
  /\b(absent|absence|sick|ill|left early|not (here|present)|didn't come|did not come)\b/i;

const TOP_BAND_CODES = new Set(['secure', 'can_do', '4']);

export function renderTemplate(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => vars[key] ?? '');
}

export function validateNoLabelNoRank(text: string): ValidationResult {
  const errors: string[] = [];
  if (PERSONALITY_TRAIT_TERMS.test(text)) {
    errors.push('Output contains personality/trait/diagnostic language');
  }
  if (RANK_COMPARISON.test(text)) {
    errors.push('Output contains rank or comparison language');
  }
  return { ok: errors.length === 0, errors };
}

export function validateNoTestLanguage(text: string): ValidationResult {
  const errors: string[] = [];
  if (TEST_EXAM_LANGUAGE.test(text)) {
    errors.push('Output contains test/exam language');
  }
  return { ok: errors.length === 0, errors };
}

export interface MapperProposalInput {
  bandCode?: string | null;
  ratingCode?: string | null;
  childNameAmbiguous?: boolean;
  rollNumberCandidates?: string[];
  observationText: string;
  routeToAttendance?: boolean;
}

export function applyMapperGuards(input: MapperProposalInput): ValidationResult {
  const errors: string[] = [];

  if (ATTENDANCE_NON_OBSERVATION.test(input.observationText)) {
    if (!input.routeToAttendance) {
      errors.push('Non-observation must route to attendance, not an outcome proposal');
    }
    return { ok: errors.length === 0, errors };
  }

  if (input.childNameAmbiguous) {
    if (!input.rollNumberCandidates || input.rollNumberCandidates.length === 0) {
      errors.push('Ambiguous name must return roll-number candidates, never a guess');
    }
  }

  const code = (input.bandCode ?? input.ratingCode ?? '').toLowerCase();
  if (TOP_BAND_CODES.has(code)) {
    errors.push('Cannot jump to top band/rating from a single sighting');
  }

  return { ok: errors.length === 0, errors };
}

export function isAttendanceNonObservation(text: string): boolean {
  return ATTENDANCE_NON_OBSERVATION.test(text);
}

export function detectSafeguardingSignal(text: string): boolean {
  return /\b(hurt|abuse|harm|bruise|hit by|unsafe|neglect)\b/i.test(text);
}

export function runValidators(
  keys: readonly string[],
  payload: { text?: string; mapper?: MapperProposalInput },
): ValidationResult {
  const errors: string[] = [];
  for (const key of keys) {
    if (key === 'no_label_no_rank' && payload.text) {
      errors.push(...validateNoLabelNoRank(payload.text).errors);
    }
    if (key === 'no_test_language' && payload.text) {
      errors.push(...validateNoTestLanguage(payload.text).errors);
    }
    if (key === 'mapper_guards' && payload.mapper) {
      errors.push(...applyMapperGuards(payload.mapper).errors);
    }
    if (key === 'safeguarding_precheck' && payload.text) {
      // Precheck is handled before generation; validator only flags residual leaks.
      if (detectSafeguardingSignal(payload.text) && /coach|try this/i.test(payload.text)) {
        errors.push('Safeguarding content must not produce coaching advice');
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

export type PedagogyType = 'five_e' | 'explicit_instruction';

/** Pedagogy is a rule from content type — never a model choice. */
export function selectPedagogy(themeOrChapter: string): PedagogyType {
  if (/\b(letters?|sounds?|phonics?|numbers?|counting|formation|patterns?)\b/i.test(themeOrChapter)) {
    return 'explicit_instruction';
  }
  return 'five_e';
}

export const NEUTRAL_PARENT_REPORT_FALLBACK =
  'This month your child participated in classroom activities. ' +
  'We look forward to sharing more specific observations as the term continues. ' +
  'Please reply if you have questions for the teacher.';
