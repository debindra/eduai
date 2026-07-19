/**
 * Client gravity-safe asserts and tenant-form helpers for platform monitoring.
 * UX only — API already strips forbidden keys / validates payloads.
 */

const FORBIDDEN_KEYS = new Set([
  'ratings',
  'bandDistributions',
  'childNames',
  'ratingDistribution',
  'bandDistribution',
  'studentNames',
  'outcomeRatings',
]);

export function assertGravitySafe(value: unknown, path = 'root'): string[] {
  const violations: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      violations.push(...assertGravitySafe(item, `${path}[${index}]`));
    });
    return violations;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (FORBIDDEN_KEYS.has(key)) {
        violations.push(`${path}.${key}`);
      } else {
        violations.push(...assertGravitySafe(nested, `${path}.${key}`));
      }
    }
  }
  return violations;
}

export type CreateTenantFormInput = {
  name: string;
  region: string;
  tier: string;
  licensedBandRange: string;
  adminEmail: string;
  adminPhone: string;
  adminDisplayName: string;
};

export type CreateTenantPayload = {
  name: string;
  region?: string;
  tier?: string;
  licensedBandRange?: string;
  adminEmail?: string;
  adminPhone?: string;
  adminDisplayName?: string;
};

/** Validate XOR contact + required school name. Returns error message or null. */
export function validateCreateTenantForm(input: CreateTenantFormInput): string | null {
  if (!input.name.trim()) {
    return 'School name is required';
  }
  const email = input.adminEmail.trim();
  const phone = input.adminPhone.trim();
  if (!email && !phone) {
    return 'Provide an admin email or phone';
  }
  if (email && phone) {
    return 'Provide admin email or phone, not both';
  }
  return null;
}

export function buildCreateTenantPayload(input: CreateTenantFormInput): CreateTenantPayload {
  const payload: CreateTenantPayload = { name: input.name.trim() };
  const region = input.region.trim();
  const tier = input.tier.trim();
  const licensedBandRange = input.licensedBandRange.trim();
  const adminDisplayName = input.adminDisplayName.trim();
  const adminEmail = input.adminEmail.trim();
  const adminPhone = input.adminPhone.trim();
  if (region) payload.region = region;
  if (tier) payload.tier = tier;
  if (licensedBandRange) payload.licensedBandRange = licensedBandRange;
  if (adminDisplayName) payload.adminDisplayName = adminDisplayName;
  if (adminEmail) payload.adminEmail = adminEmail;
  if (adminPhone) payload.adminPhone = adminPhone;
  return payload;
}

export function needsCalendarSetup(calendarStatus: 'none' | 'draft' | 'approved'): boolean {
  return calendarStatus === 'none';
}

export type TenantCalendarListAction = 'setup' | 'closures' | 'view' | 'edit';

/** Primary list actions for a tenant calendar status. */
export function tenantCalendarActions(
  calendarStatus: 'none' | 'draft' | 'approved',
): TenantCalendarListAction[] {
  if (calendarStatus === 'none') return ['setup'];
  if (calendarStatus === 'draft') return ['closures'];
  return ['view', 'edit'];
}

/** @deprecated Prefer tenantCalendarActions — kept for single-primary-action callers. */
export function tenantCalendarAction(
  calendarStatus: 'none' | 'draft' | 'approved',
): TenantCalendarListAction {
  return tenantCalendarActions(calendarStatus)[0]!;
}

export function tenantCalendarActionLabel(action: TenantCalendarListAction): string {
  if (action === 'setup') return 'Setup calendar';
  if (action === 'closures') return 'Configure closures';
  if (action === 'edit') return 'Edit calendar';
  return 'View calendar';
}

/** Highlighted title for an approved tenant calendar view. */
export function formatApprovedAcademicCalendarTitle(
  schoolName: string | null | undefined,
  academicYearLabel: string | null | undefined,
): string {
  const school = schoolName?.trim() || 'School';
  const year = academicYearLabel?.trim();
  if (year) return `${school} · ${year} Academic Calendar`;
  return `${school} · Academic Calendar`;
}
