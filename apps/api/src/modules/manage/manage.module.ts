import { Module } from '@nestjs/common';
import { AiOrchestrationModule } from '../ai-orchestration/ai-orchestration.module';
import { AuthModule } from '../auth/auth.module';
import { PacingModule } from '../pacing/pacing.module';
import { RbacModule } from '../rbac/rbac.module';
import { ManageController } from './manage.controller';
import { ManageRepository, ManageService } from './manage.service';

@Module({
  imports: [AuthModule, RbacModule, PacingModule, AiOrchestrationModule],
  controllers: [ManageController],
  providers: [ManageService, ManageRepository],
  exports: [ManageService],
})
export class ManageModule {}
