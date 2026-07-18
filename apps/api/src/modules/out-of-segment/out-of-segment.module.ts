import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { OutOfSegmentRepository, OutOfSegmentService } from './out-of-segment.service';

@Module({
  imports: [DatabaseModule],
  providers: [OutOfSegmentService, OutOfSegmentRepository],
  exports: [OutOfSegmentService],
})
export class OutOfSegmentModule {}
