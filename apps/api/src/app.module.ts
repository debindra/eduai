import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { BandConfigModule } from './modules/band-config/band-config.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { RbacModule } from './modules/rbac/rbac.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    DatabaseModule,
    AuthModule,
    RbacModule,
    BandConfigModule,
    CalendarModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
