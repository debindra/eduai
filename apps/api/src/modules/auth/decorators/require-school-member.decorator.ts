import { SetMetadata } from '@nestjs/common';

export const REQUIRE_SCHOOL_MEMBER_KEY = 'requireSchoolMember';

export interface RequireSchoolMemberOptions {
  schoolIdParam?: string;
  schoolIdQuery?: string;
  schoolIdBody?: string;
}

/** Allows admin or teacher membership for the school (or platform support session). */
export const RequireSchoolMember = (options: RequireSchoolMemberOptions) =>
  SetMetadata(REQUIRE_SCHOOL_MEMBER_KEY, options);
