import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AI_PROVIDER_PORT } from '../../shared/ports/ai-provider.port';
import { ConsoleAiAdapter } from './adapters/console-ai.adapter';
import { AiOrchestrationRepository } from './ai-orchestration.repository';
import { AiOrchestrationService } from './ai-orchestration.service';

@Module({
  imports: [DatabaseModule],
  providers: [
    AiOrchestrationService,
    AiOrchestrationRepository,
    { provide: AI_PROVIDER_PORT, useClass: ConsoleAiAdapter },
  ],
  exports: [AiOrchestrationService],
})
export class AiOrchestrationModule {}
