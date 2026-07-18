import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiOrchestrationModule } from '../ai-orchestration/ai-orchestration.module';
import { OutcomesModule } from '../outcomes/outcomes.module';
import { RbacModule } from '../rbac/rbac.module';
import { ReportsController } from './reports.controller';
import { ReportsRepository, ReportsService } from './reports.service';

@Module({
  imports: [AuthModule, AiOrchestrationModule, OutcomesModule, RbacModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsRepository],
  exports: [ReportsService],
})
export class ReportsModule {}
