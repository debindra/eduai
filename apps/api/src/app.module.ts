import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { AdminModule } from './modules/admin/admin.module';
import { AggregationModule } from './modules/aggregation/aggregation.module';
import { AiOrchestrationModule } from './modules/ai-orchestration/ai-orchestration.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AuthModule } from './modules/auth/auth.module';
import { BandConfigModule } from './modules/band-config/band-config.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { CertificationModule } from './modules/certification/certification.module';
import { CoachModule } from './modules/coach/coach.module';
import { CommunityModule } from './modules/community/community.module';
import { EcaCcaModule } from './modules/eca-cca/eca-cca.module';
import { ExitModule } from './modules/exit/exit.module';
import { HandoverModule } from './modules/handover/handover.module';
import { LessonModule } from './modules/lessons/lesson.module';
import { ManageModule } from './modules/manage/manage.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { MethodsToolkitModule } from './modules/methods-toolkit/methods-toolkit.module';
import { OutcomesModule } from './modules/outcomes/outcomes.module';
import { PacingModule } from './modules/pacing/pacing.module';
import { PlanningCascadeModule } from './modules/planning-cascade/planning-cascade.module';
import { PlatformModule } from './modules/platform/platform.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { RemedialModule } from './modules/remedial/remedial.module';
import { ReportsModule } from './modules/reports/reports.module';
import { RosterModule } from './modules/roster/roster.module';
import { SubjectModule } from './modules/subject/subject.module';
import { TeacherContextModule } from './modules/teacher-context/teacher-context.module';
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
    PlatformModule,
    EcaCcaModule,
    BandConfigModule,
    CalendarModule,
    RosterModule,
    TeacherContextModule,
    AiOrchestrationModule,
    YearlyMapModule,
    PlanningCascadeModule,
    PacingModule,
    AttendanceModule,
    OutcomesModule,
    LessonModule,
    CoachModule,
    ReportsModule,
    AdminModule,
    ManageModule,
    MessagingModule,
    HandoverModule,
    ExitModule,
    AggregationModule,
    RemedialModule,
    MethodsToolkitModule,
    SubjectModule,
    CertificationModule,
    CommunityModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
