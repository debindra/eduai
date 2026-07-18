import { Module } from '@nestjs/common';
import { AUTH_PROVIDER_PORT } from '../../shared/ports/auth-provider.port';
import { MESSAGING_PROVIDER_PORT } from '../../shared/ports/messaging-provider.port';
import { OTP_FALLBACK_PORT } from '../../shared/ports/otp-fallback.port';
import { ConsoleMessagingAdapter } from './adapters/console-messaging.adapter';
import { ConsoleOtpAdapter } from './adapters/console-otp.adapter';
import { SupabaseAuthAdapter } from './adapters/supabase-auth.adapter';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RequireRoleGuard } from './guards/require-role.guard';
import { RequireSchoolAdminGuard } from './guards/require-school-admin.guard';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    SupabaseAuthGuard,
    RequireRoleGuard,
    RequireSchoolAdminGuard,
    { provide: AUTH_PROVIDER_PORT, useClass: SupabaseAuthAdapter },
    { provide: MESSAGING_PROVIDER_PORT, useClass: ConsoleMessagingAdapter },
    { provide: OTP_FALLBACK_PORT, useClass: ConsoleOtpAdapter },
  ],
  exports: [
    AuthService,
    SupabaseAuthGuard,
    RequireRoleGuard,
    RequireSchoolAdminGuard,
    AUTH_PROVIDER_PORT,
  ],
})
export class AuthModule {}
