import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { YearlyMapModule } from '../yearly-map/yearly-map.module';
import { PlanningCascadeController } from './planning-cascade.controller';
import {
  PlanningCascadeRepository,
  PlanningCascadeService,
} from './planning-cascade.service';

@Module({
  imports: [AuthModule, YearlyMapModule],
  controllers: [PlanningCascadeController],
  providers: [PlanningCascadeService, PlanningCascadeRepository],
  exports: [PlanningCascadeService],
})
export class PlanningCascadeModule {}
