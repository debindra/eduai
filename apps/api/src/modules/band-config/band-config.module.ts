import { Module } from '@nestjs/common';
import { BandConfigController } from './band-config.controller';
import { BandConfigService } from './band-config.service';

@Module({
  controllers: [BandConfigController],
  providers: [BandConfigService],
  exports: [BandConfigService],
})
export class BandConfigModule {}
