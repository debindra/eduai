import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiOrchestrationModule } from '../ai-orchestration/ai-orchestration.module';
import { RbacModule } from '../rbac/rbac.module';
import { OutcomesController } from './outcomes.controller';
import { OutcomesRepository, OutcomesService } from './outcomes.service';

@Module({
  imports: [AuthModule, AiOrchestrationModule, RbacModule],
  controllers: [OutcomesController],
  providers: [OutcomesService, OutcomesRepository],
  exports: [OutcomesService, OutcomesRepository],
})
export class OutcomesModule {}
