import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { SupportSessionAccessService } from './support-session-access.service';

/** Thin module so AuthModule can depend on support-session access without a cycle. */
@Module({
  providers: [AuditService, SupportSessionAccessService],
  exports: [AuditService, SupportSessionAccessService],
})
export class PlatformAccessModule {}
