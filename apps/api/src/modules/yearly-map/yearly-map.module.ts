import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { YearlyMapController } from './yearly-map.controller';
import { YearlyMapRepository } from './yearly-map.repository';
import { YearlyMapService } from './yearly-map.service';

@Module({
  imports: [AuthModule],
  controllers: [YearlyMapController],
  providers: [YearlyMapService, YearlyMapRepository],
  exports: [YearlyMapService],
})
export class YearlyMapModule {}
