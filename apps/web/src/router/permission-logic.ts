import type { SessionState } from '../lib/shared/stores/session';

export type RouterUser = {
  memberType: NonNullable<SessionState>['memberType'];
  schoolId: string | null;
  permissions: string[];
};

/** Active support-session scope — UX only; API enforces access. */
export type SupportSessionScope = {
  schoolId: string;
} | null;

/** Subset of router permission requirements — kept local so this module stays dependency-free. */
export type PermissionRequirements = {
  any?: string[];
  all?: string[];
};

/** Pure helper — UX route gating only, not a security boundary. */
export function sessionToRouterUser(
  value: SessionState,
  supportSession: SupportSessionScope = null,
): RouterUser | null {
  if (!value) {
    return null;
  }
  let permissions: string[];
  if (value.memberType === 'super_admin') {
    // Active support session unlocks school-admin chrome for drill-down.
    permissions = supportSession?.schoolId ? ['platform', 'admin'] : ['platform'];
  } else if (value.memberType === 'admin') {
    permissions = ['admin', 'teacher'];
  } else {
    permissions = ['teacher'];
  }
  return {
    memberType: value.memberType,
    schoolId: value.schoolId ?? supportSession?.schoolId ?? null,
    permissions,
  };
}

/** Pure helper — UX route gating only, not a security boundary. */
export function checkPermissions(
  user: RouterUser | null,
  requirements: PermissionRequirements | undefined,
): boolean {
  if (!user || !requirements) {
    return false;
  }
  if (requirements.any?.length) {
    return requirements.any.some((permission) =>
      user.permissions.includes(permission),
    );
  }
  if (requirements.all?.length) {
    return requirements.all.every((permission) =>
      user.permissions.includes(permission),
    );
  }
  return true;
}

export const routePermissions = {
  public: undefined,
  admin: { any: ['admin'] as string[] },
  teacher: { any: ['teacher'] as string[] },
  platform: { any: ['platform'] as string[] },
} as const;
