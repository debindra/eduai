import { Controller, Get, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import type { Request } from 'express';
import { RequireRole } from '../auth/decorators/require-role.decorator';
import { RequireSchoolAdmin } from '../auth/decorators/require-school-admin.decorator';
import { RequireRoleGuard } from '../auth/guards/require-role.guard';
import { RequireSchoolAdminGuard } from '../auth/guards/require-school-admin.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { AdminGravityRuleInterceptor } from '../rbac/interceptors/admin-gravity-rule.interceptor';
import { AdminService } from './admin.service';

class DashboardQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  periodStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  periodEnd?: string;

  @ApiProperty({ description: 'School id — required for multi-school admins' })
  @IsString()
  schoolId!: string;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RequireRoleGuard, RequireSchoolAdminGuard)
@RequireRole('admin')
@UseInterceptors(AdminGravityRuleInterceptor)
@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('dashboard')
  @RequireSchoolAdmin({ schoolIdQuery: 'schoolId' })
  @ApiOperation({
    summary: 'Gravity-shaped compliance dashboard',
    description:
      'Counts and shapes only — never band/rating distributions, never child names, never teacher league tables. Requires admin role.',
  })
  dashboard(@Query() query: DashboardQueryDto, @Req() _req: Request) {
    const end = query.periodEnd ?? new Date().toISOString().slice(0, 10);
    const start =
      query.periodStart ??
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return this.service.getDashboard(query.schoolId, start, end);
  }

  @Get('cache-metrics')
  @ApiOperation({
    summary: 'Cache hit-rate monitoring (P5-API-01)',
    description:
      'Hit/miss counts and rates per feature. The remedial-activity cache ' +
      '(methods_toolkit) is reported separately. Counts/shapes only.',
  })
  cacheMetrics() {
    return this.service.getCacheMetrics();
  }

  @Get('out-of-segment')
  @RequireSchoolAdmin({ schoolIdQuery: 'schoolId' })
  @ApiOperation({
    summary: 'Out-of-segment demand signal (P5-API-02)',
    description:
      'Counts of requests for functionality outside the school licensed band ' +
      'range, grouped by band and feature. Counts/shapes only (gravity rule).',
  })
  outOfSegment(@Query() query: DashboardQueryDto) {
    return this.service.getOutOfSegment(query.schoolId);
  }
}
