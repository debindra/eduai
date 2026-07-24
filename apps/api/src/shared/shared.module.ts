import { Global, Module } from '@nestjs/common';
import { ConsoleStorageAdapter } from './adapters/console-storage.adapter';
import { STORAGE_PORT } from './ports/storage.port';
import { AxiomLoggerService } from './services/axiom-logger.service';

/**
 * Global shared module providing port implementations and shared services
 * Port adapters and services registered here are available throughout the app
 */
@Global()
@Module({
  providers: [
    {
      provide: STORAGE_PORT,
      useClass: ConsoleStorageAdapter,
    },
    AxiomLoggerService,
  ],
  exports: [STORAGE_PORT, AxiomLoggerService],
})
export class SharedModule {}
