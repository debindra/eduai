import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';
import { RequireRole } from '../auth/decorators/require-role.decorator';
import { RequireSchoolAdmin } from '../auth/decorators/require-school-admin.decorator';
import { RequireRoleGuard } from '../auth/guards/require-role.guard';
import { RequireSchoolAdminGuard } from '../auth/guards/require-school-admin.guard';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { ExitService } from './exit.service';

class InitiateExitDto {
  @ApiPropertyOptional({ default: 90 })
  @IsOptional()
  @IsInt()
  @Min(1)
  retentionDays?: number;
}

@ApiTags('exit')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RequireRoleGuard)
@RequireRole('admin')
@Controller('exit')
export class ExitController {
  constructor(private readonly service: ExitService) {}

  @Post('children/:childId/leaving-pack')
  @ApiOperation({
    summary: 'Per-child leaving pack via DocGen',
    description: 'Calls DocGen leaving-pack render — does not reimplement templates.',
  })
  leavingPack(@Param('childId') childId: string) {
    return this.service.createLeavingPack(childId);
  }

  @Post('schools/:schoolId/initiate')
  @UseGuards(RequireSchoolAdminGuard)
  @RequireSchoolAdmin({ schoolIdParam: 'schoolId' })
  @ApiOperation({ summary: 'Initiate school exit + schedule deletion after retention window' })
  initiate(@Param('schoolId') schoolId: string, @Body() dto: InitiateExitDto) {
    return this.service.initiateSchoolExit(schoolId, dto.retentionDays);
  }

  @Post('deletion-sweep')
  @ApiOperation({
    summary: 'Run deletion sweep (call from scheduler)',
    description: 'Only processes schools with exit_status=pending_deletion past deletion_scheduled_at.',
  })
  sweep() {
    return this.service.runDeletionSweep();
  }
}
