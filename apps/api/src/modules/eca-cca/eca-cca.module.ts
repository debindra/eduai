import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EcaCcaCatalogController } from './eca-cca-catalog.controller';
import { EcaCcaController } from './eca-cca.controller';
import { EcaCcaService } from './eca-cca.service';

@Module({
  imports: [AuthModule],
  controllers: [EcaCcaCatalogController, EcaCcaController],
  providers: [EcaCcaService],
  exports: [EcaCcaService],
})
export class EcaCcaModule {}
