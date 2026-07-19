export type AccountStatus = 'invited' | 'active' | 'disabled';
export type MemberType = 'teacher' | 'admin' | 'guardian' | 'trainer_viewer';
export type MembershipStatus = 'active' | 'suspended' | 'revoked';

export interface RequestMembership {
  id: string;
  schoolId: string;
  memberType: MemberType;
  status: MembershipStatus;
  teacherId: string | null;
  adminId: string | null;
}

export interface RequestPlatformAdmin {
  id: string;
  displayName: string | null;
}

export interface RequestUser {
  identityId: string;
  authUserId: string;
  accountStatus: AccountStatus;
  email: string | null;
  phone: string | null;
  memberships: RequestMembership[];
  /** Present when the identity is an active platform super admin. */
  platformAdmin: RequestPlatformAdmin | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

export {};
