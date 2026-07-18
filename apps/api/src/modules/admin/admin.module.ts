import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OutcomesModule } from '../outcomes/outcomes.module';
import { PacingModule } from '../pacing/pacing.module';
import { RbacModule } from '../rbac/rbac.module';
import { AdminController } from './admin.controller';
import { AdminRepository, AdminService } from './admin.service';

@Module({
  imports: [AuthModule, RbacModule, PacingModule, OutcomesModule],
  controllers: [AdminController],
  providers: [AdminService, AdminRepository],
  exports: [AdminService],
})
export class AdminModule {}
