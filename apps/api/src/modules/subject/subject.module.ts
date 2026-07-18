import { Module } from '@nestjs/common';
import { AggregationModule } from '../aggregation/aggregation.module';
import { AuthModule } from '../auth/auth.module';
import { RbacModule } from '../rbac/rbac.module';
import { SubjectController } from './subject.controller';
import { SubjectRepository, SubjectService } from './subject.service';

@Module({
  imports: [AuthModule, RbacModule, AggregationModule],
  controllers: [SubjectController],
  providers: [SubjectService, SubjectRepository],
  exports: [SubjectService],
})
export class SubjectModule {}
