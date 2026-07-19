import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TeacherContextController } from './teacher-context.controller';
import { TeacherContextService } from './teacher-context.service';

@Module({
  imports: [AuthModule],
  controllers: [TeacherContextController],
  providers: [TeacherContextService],
  exports: [TeacherContextService],
})
export class TeacherContextModule {}
