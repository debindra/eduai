import { SetMetadata } from '@nestjs/common';

export const PLATFORM_SUPPORT_SESSION_KEY = 'platformSupportSession';

export interface PlatformSupportSessionOptions {
  schoolIdParam?: string;
  schoolIdBody?: string;
  schoolIdQuery?: string;
}

export const RequirePlatformSupportSession = (options: PlatformSupportSessionOptions) =>
  SetMetadata(PLATFORM_SUPPORT_SESSION_KEY, options);
