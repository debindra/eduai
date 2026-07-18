import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { AiOrchestrationModule } from './modules/ai-orchestration/ai-orchestration.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AuthModule } from './modules/auth/auth.module';
import { BandConfigModule } from './modules/band-config/band-config.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { CoachModule } from './modules/coach/coach.module';
import { LessonModule } from './modules/lessons/lesson.module';
import { OutcomesModule } from './modules/outcomes/outcomes.module';
import { PacingModule } from './modules/pacing/pacing.module';
import { PlanningCascadeModule } from './modules/planning-cascade/planning-cascade.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { ReportsModule } from './modules/reports/reports.module';
import { YearlyMapModule } from './modules/yearly-map/yearly-map.module';

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
    AiOrchestrationModule,
    YearlyMapModule,
    PlanningCascadeModule,
    PacingModule,
    AttendanceModule,
    OutcomesModule,
    LessonModule,
    CoachModule,
    ReportsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
