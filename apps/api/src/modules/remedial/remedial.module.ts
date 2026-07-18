import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OutcomesModule } from '../outcomes/outcomes.module';
import { RbacModule } from '../rbac/rbac.module';
import { RemedialController } from './remedial.controller';
import { RemedialRepository, RemedialService } from './remedial.service';

@Module({
  imports: [AuthModule, RbacModule, OutcomesModule],
  controllers: [RemedialController],
  providers: [RemedialService, RemedialRepository],
  exports: [RemedialService],
})
export class RemedialModule {}
