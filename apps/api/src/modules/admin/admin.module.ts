import { Module } from '@nestjs/common';
import { AiOrchestrationModule } from '../ai-orchestration/ai-orchestration.module';
import { AuthModule } from '../auth/auth.module';
import { OutOfSegmentModule } from '../out-of-segment/out-of-segment.module';
import { OutcomesModule } from '../outcomes/outcomes.module';
import { PacingModule } from '../pacing/pacing.module';
import { RbacModule } from '../rbac/rbac.module';
import { AdminController } from './admin.controller';
import { AdminRepository, AdminService } from './admin.service';

@Module({
  imports: [
    AuthModule,
    RbacModule,
    PacingModule,
    OutcomesModule,
    AiOrchestrationModule,
    OutOfSegmentModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, AdminRepository],
  exports: [AdminService],
})
export class AdminModule {}
