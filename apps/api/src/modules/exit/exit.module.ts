import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ExitController } from './exit.controller';
import { ExitRepository, ExitService } from './exit.service';

@Module({
  imports: [AuthModule],
  controllers: [ExitController],
  providers: [ExitService, ExitRepository],
  exports: [ExitService],
})
export class ExitModule {}
