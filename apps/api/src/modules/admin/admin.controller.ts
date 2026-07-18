import { Controller, Get, Query, Req, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import type { Request } from 'express';
import { RequireRole } from '../auth/decorators/require-role.decorator';
import { RequireRoleGuard } from '../auth/guards/require-role.guard';
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
@UseGuards(SupabaseAuthGuard, RequireRoleGuard)
@RequireRole('admin')
@UseInterceptors(AdminGravityRuleInterceptor)
@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('dashboard')
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
}
