import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PacingModule } from '../pacing/pacing.module';
import { RbacModule } from '../rbac/rbac.module';
import { HandoverController } from './handover.controller';
import { HandoverRepository, HandoverService } from './handover.service';

@Module({
  imports: [AuthModule, RbacModule, PacingModule],
  controllers: [HandoverController],
  providers: [HandoverService, HandoverRepository],
  exports: [HandoverService],
})
export class HandoverModule {}
