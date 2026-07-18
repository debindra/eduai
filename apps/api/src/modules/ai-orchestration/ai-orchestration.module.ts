import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AI_PROVIDER_PORT } from '../../shared/ports/ai-provider.port';
import { CACHE_PORT } from '../../shared/ports/cache.port';
import { OutOfSegmentModule } from '../out-of-segment/out-of-segment.module';
import { ConsoleAiAdapter } from './adapters/console-ai.adapter';
import { InMemoryCacheAdapter } from './adapters/in-memory-cache.adapter';
import { AiOrchestrationRepository } from './ai-orchestration.repository';
import { AiOrchestrationService } from './ai-orchestration.service';
import { CacheMetricsService } from './cache-metrics.service';

@Module({
  imports: [DatabaseModule, OutOfSegmentModule],
  providers: [
    AiOrchestrationService,
    AiOrchestrationRepository,
    CacheMetricsService,
    { provide: AI_PROVIDER_PORT, useClass: ConsoleAiAdapter },
    { provide: CACHE_PORT, useClass: InMemoryCacheAdapter },
  ],
  exports: [AiOrchestrationService, CacheMetricsService],
})
export class AiOrchestrationModule {}
