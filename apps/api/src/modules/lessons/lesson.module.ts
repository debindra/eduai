import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiOrchestrationModule } from '../ai-orchestration/ai-orchestration.module';
import { PlanningCascadeModule } from '../planning-cascade/planning-cascade.module';
import { LessonController } from './lesson.controller';
import { LessonRepository, LessonService } from './lesson.service';

@Module({
  imports: [AuthModule, AiOrchestrationModule, PlanningCascadeModule],
  controllers: [LessonController],
  providers: [LessonService, LessonRepository],
  exports: [LessonService],
})
export class LessonModule {}
