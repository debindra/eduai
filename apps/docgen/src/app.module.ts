import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { DocgenController } from './docgen.controller';
import { DeterministicRendererService } from './rendering/deterministic-renderer.service';
import { STORAGE_PORT } from './shared/ports/storage.port';
import { ConsoleStorageAdapter } from './adapters/console-storage.adapter';

@Module({
  imports: [DatabaseModule],
  controllers: [DocgenController],
  providers: [
    DeterministicRendererService,
    { provide: STORAGE_PORT, useClass: ConsoleStorageAdapter },
  ],
})
export class AppModule {}
