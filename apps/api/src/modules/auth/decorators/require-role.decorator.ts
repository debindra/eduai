import { SetMetadata } from '@nestjs/common';
import type { MemberType } from '../types/request-user.types';

export const REQUIRE_ROLE_KEY = 'requireRole';

export const RequireRole = (...roles: MemberType[]) => SetMetadata(REQUIRE_ROLE_KEY, roles);
