import { SetMetadata } from '@nestjs/common';

export const REQUIRE_SCHOOL_ADMIN_KEY = 'requireSchoolAdmin';

export interface RequireSchoolAdminOptions {
  schoolIdParam?: string;
  schoolIdBody?: string;
}

export const RequireSchoolAdmin = (options: RequireSchoolAdminOptions) =>
  SetMetadata(REQUIRE_SCHOOL_ADMIN_KEY, options);
