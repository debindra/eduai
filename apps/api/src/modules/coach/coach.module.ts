import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiOrchestrationModule } from '../ai-orchestration/ai-orchestration.module';
import { CoachController } from './coach.controller';
import { CoachRepository, CoachService } from './coach.service';

@Module({
  imports: [AuthModule, AiOrchestrationModule],
  controllers: [CoachController],
  providers: [CoachService, CoachRepository],
  exports: [CoachService],
})
export class CoachModule {}
