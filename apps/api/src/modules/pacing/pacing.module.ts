import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PacingController } from './pacing.controller';
import { PacingRepository, PacingService } from './pacing.service';

@Module({
  imports: [AuthModule],
  controllers: [PacingController],
  providers: [PacingService, PacingRepository],
  exports: [PacingService],
})
export class PacingModule {}
