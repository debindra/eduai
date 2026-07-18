import type { SessionState } from '../lib/shared/stores/session';

export type RouterUser = {
  memberType: SessionState extends null ? never : NonNullable<SessionState>['memberType'];
  schoolId: string;
  permissions: string[];
};

/** Subset of router permission requirements — kept local so this module stays dependency-free. */
export type PermissionRequirements = {
  any?: string[];
  all?: string[];
};

/** Pure helper — UX route gating only, not a security boundary. */
export function sessionToRouterUser(value: SessionState): RouterUser | null {
  if (!value) {
    return null;
  }
  const permissions =
    value.memberType === 'admin' ? ['admin', 'teacher'] : ['teacher'];
  return {
    memberType: value.memberType,
    schoolId: value.schoolId,
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
} as const;
