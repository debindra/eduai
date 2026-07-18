import { Module } from '@nestjs/common';
import { AdminGravityRuleInterceptor } from './interceptors/admin-gravity-rule.interceptor';
import { SectionReadGuard } from './guards/section-read.guard';
import { SectionSubjectWriteGuard } from './guards/section-subject-write.guard';
import { SubstituteRoleGuard } from './guards/substitute-role.guard';

@Module({
  providers: [
    SectionSubjectWriteGuard,
    SectionReadGuard,
    SubstituteRoleGuard,
    AdminGravityRuleInterceptor,
  ],
  exports: [
    SectionSubjectWriteGuard,
    SectionReadGuard,
    SubstituteRoleGuard,
    AdminGravityRuleInterceptor,
  ],
})
export class RbacModule {}
