import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { NationalCalendarController } from './national-calendar.controller';
import { NationalCalendarService } from './national-calendar.service';
import { PlatformAccessModule } from './platform-access.module';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { PlatformSupportSessionGuard } from './guards/platform-support-session.guard';

@Module({
  imports: [AuthModule, RbacModule, PlatformAccessModule],
  controllers: [PlatformController, NationalCalendarController],
  providers: [
    PlatformService,
    NationalCalendarService,
    PlatformSupportSessionGuard,
  ],
  exports: [
    PlatformService,
    NationalCalendarService,
    PlatformSupportSessionGuard,
    PlatformAccessModule,
  ],
})
export class PlatformModule {}
