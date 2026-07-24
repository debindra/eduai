import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RatingsController } from './ratings.controller';
import { RatingsRepository, RatingsService } from './ratings.service';

@Module({
  imports: [AuthModule],
  controllers: [RatingsController],
  providers: [RatingsService, RatingsRepository],
  exports: [RatingsService, RatingsRepository],
})
export class RatingsModule {}
