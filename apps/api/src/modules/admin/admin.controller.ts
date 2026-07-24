import { Controller, Get, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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
    description: `Returns aggregate counts and shapes only.\n\nInvariant #3 (Gravity Rule): Admin sees practice-level aggregates only — never band/rating distributions, never individual child names, never teacher league tables.\n\nRequires: RequireRoleGuard (role='admin') AND RequireSchoolAdminGuard (school admin for specified school).`,
  })
  @ApiOkResponse({ description: 'Dashboard data retrieved successfully (aggregates only)' })
  @ApiBadRequestResponse({ description: 'Validation failed or invalid date range' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Not a school admin' })
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
      '(methods_toolkit) is reported separately. Counts/shapes only.\n\nRequires: RequireRoleGuard (role=\'admin\').',
  })
  @ApiOkResponse({ description: 'Cache metrics retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Not an admin' })
  cacheMetrics() {
    return this.service.getCacheMetrics();
  }

  @Get('out-of-segment')
  @RequireSchoolAdmin({ schoolIdQuery: 'schoolId' })
  @ApiOperation({
    summary: 'Out-of-segment demand signal (P5-API-02)',
    description:
      'Counts of requests for functionality outside the school licensed band ' +
      'range, grouped by band and feature. Counts/shapes only (gravity rule).\n\nRequires: RequireRoleGuard (role=\'admin\') AND RequireSchoolAdminGuard (school admin for specified school).',
  })
  @ApiOkResponse({ description: 'Out-of-segment usage data retrieved successfully' })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Not a school admin' })
  outOfSegment(@Query() query: DashboardQueryDto) {
    return this.service.getOutOfSegment(query.schoolId);
  }
}
