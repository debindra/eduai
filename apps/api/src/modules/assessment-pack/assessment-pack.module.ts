import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AssessmentPackController } from './assessment-pack.controller';

@Module({
  imports: [AuthModule],
  controllers: [AssessmentPackController],
})
export class AssessmentPackModule {}
