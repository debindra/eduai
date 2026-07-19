import { describe, expect, it } from 'vitest';
import {
  assertGravitySafe,
  buildCreateTenantPayload,
  formatApprovedAcademicCalendarTitle,
  needsCalendarSetup,
  tenantCalendarAction,
  tenantCalendarActionLabel,
  tenantCalendarActions,
  validateCreateTenantForm,
} from './platform-logic';

describe('assertGravitySafe', () => {
  it('accepts count/shape payloads', () => {
    expect(
      assertGravitySafe({
        schools: [{ id: 's1', sectionsTotal: 3, sectionsBehind: 1, teachersTotal: 2 }],
      }),
    ).toEqual([]);
  });

  it('flags forbidden distribution and name keys', () => {
    const violations = assertGravitySafe({
      childNames: ['A'],
      nested: { bandDistributions: { a: 1 } },
    });
    expect(violations).toContain('root.childNames');
    expect(violations).toContain('root.nested.bandDistributions');
  });
});

describe('validateCreateTenantForm', () => {
  const base = {
    name: 'School Y',
    region: '',
    tier: '',
    licensedBandRange: '',
    adminEmail: '',
    adminPhone: '',
    adminDisplayName: '',
  };

  it('requires school name', () => {
    expect(validateCreateTenantForm({ ...base, name: '  ' })).toBe('School name is required');
  });

  it('requires email or phone', () => {
    expect(validateCreateTenantForm(base)).toBe('Provide an admin email or phone');
  });

  it('rejects both email and phone', () => {
    expect(
      validateCreateTenantForm({
        ...base,
        adminEmail: 'a@b.com',
        adminPhone: '9800000000',
      }),
    ).toBe('Provide admin email or phone, not both');
  });

  it('accepts email-only', () => {
    expect(validateCreateTenantForm({ ...base, adminEmail: 'a@b.com' })).toBeNull();
  });
});

describe('buildCreateTenantPayload', () => {
  it('omits blank optional fields and picks email', () => {
    expect(
      buildCreateTenantPayload({
        name: '  School Y  ',
        region: '',
        tier: 'pilot',
        licensedBandRange: '  ',
        adminEmail: 'admin@y.dev',
        adminPhone: '',
        adminDisplayName: 'Ada',
      }),
    ).toEqual({
      name: 'School Y',
      tier: 'pilot',
      adminEmail: 'admin@y.dev',
      adminDisplayName: 'Ada',
    });
  });
});

describe('needsCalendarSetup', () => {
  it('is true only when no calendar exists yet', () => {
    expect(needsCalendarSetup('none')).toBe(true);
    expect(needsCalendarSetup('draft')).toBe(false);
    expect(needsCalendarSetup('approved')).toBe(false);
  });
});

describe('tenantCalendarAction', () => {
  it('routes list actions by calendar status', () => {
    expect(tenantCalendarAction('none')).toBe('setup');
    expect(tenantCalendarAction('draft')).toBe('closures');
    expect(tenantCalendarAction('approved')).toBe('view');
    expect(tenantCalendarActions('approved')).toEqual(['view', 'edit']);
  });

  it('labels actions', () => {
    expect(tenantCalendarActionLabel('setup')).toBe('Setup calendar');
    expect(tenantCalendarActionLabel('closures')).toBe('Configure closures');
    expect(tenantCalendarActionLabel('view')).toBe('View calendar');
    expect(tenantCalendarActionLabel('edit')).toBe('Edit calendar');
  });
});

describe('formatApprovedAcademicCalendarTitle', () => {
  it('highlights school name and academic year', () => {
    expect(formatApprovedAcademicCalendarTitle('School X', '2082/83')).toBe(
      'School X · 2082/83 Academic Calendar',
    );
    expect(formatApprovedAcademicCalendarTitle(null, null)).toBe('School · Academic Calendar');
  });
});
