import { Module, forwardRef } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CalendarModule } from '../calendar/calendar.module';
import { RbacModule } from '../rbac/rbac.module';
import { NationalCalendarController } from './national-calendar.controller';
import { NationalCalendarService } from './national-calendar.service';
import { PlatformAccessModule } from './platform-access.module';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { PlatformSupportSessionGuard } from './guards/platform-support-session.guard';

@Module({
  imports: [
    AuthModule,
    RbacModule,
    PlatformAccessModule,
    forwardRef(() => CalendarModule),
  ],
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
