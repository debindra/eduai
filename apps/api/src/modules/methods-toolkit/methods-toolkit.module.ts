import { Module } from '@nestjs/common';
import { AiOrchestrationModule } from '../ai-orchestration/ai-orchestration.module';
import { AuthModule } from '../auth/auth.module';
import { MethodsToolkitController } from './methods-toolkit.controller';
import {
  MethodsToolkitRepository,
  MethodsToolkitService,
} from './methods-toolkit.service';

@Module({
  imports: [AuthModule, AiOrchestrationModule],
  controllers: [MethodsToolkitController],
  providers: [MethodsToolkitService, MethodsToolkitRepository],
  exports: [MethodsToolkitService],
})
export class MethodsToolkitModule {}
