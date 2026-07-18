import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CertificationController } from './certification.controller';
import { CertificationRepository, CertificationService } from './certification.service';

@Module({
  imports: [AuthModule],
  controllers: [CertificationController],
  providers: [CertificationService, CertificationRepository],
  exports: [CertificationService],
})
export class CertificationModule {}
