import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { AggregationController } from './aggregation.controller';
import { AggregationRepository, AggregationService } from './aggregation.service';

@Module({
  imports: [AuthModule, RbacModule],
  controllers: [AggregationController],
  providers: [AggregationService, AggregationRepository],
  exports: [AggregationService],
})
export class AggregationModule {}
