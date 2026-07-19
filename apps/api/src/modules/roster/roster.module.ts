import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RosterController } from './roster.controller';
import { RosterRepository } from './roster.repository';
import { RosterService } from './roster.service';

@Module({
  imports: [AuthModule],
  controllers: [RosterController],
  providers: [RosterService, RosterRepository],
  exports: [RosterService],
})
export class RosterModule {}
