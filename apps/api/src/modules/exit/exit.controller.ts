import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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
    description: `Generates leaving pack document for exiting child.\n\nCalls DocGen service for deterministic rendering — does not reimplement templates.\n\nRequires: RequireRoleGuard (role='admin').`,
  })
  @ApiOkResponse({ description: 'Leaving pack generated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid child ID' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Not an admin' })
  @ApiNotFoundResponse({ description: 'Child not found' })
  leavingPack(@Param('childId') childId: string) {
    return this.service.createLeavingPack(childId);
  }

  @Post('schools/:schoolId/initiate')
  @UseGuards(RequireSchoolAdminGuard)
  @RequireSchoolAdmin({ schoolIdParam: 'schoolId' })
  @ApiOperation({
    summary: 'Initiate school exit + schedule deletion after retention window',
    description: `Marks school for deletion after retention period (default 90 days).\n\nRequires: RequireRoleGuard (role='admin') AND RequireSchoolAdminGuard (school admin for this school).`,
  })
  @ApiOkResponse({ description: 'School exit initiated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid retention days or school already exited' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Not a school admin' })
  initiate(@Param('schoolId') schoolId: string, @Body() dto: InitiateExitDto) {
    return this.service.initiateSchoolExit(schoolId, dto.retentionDays);
  }

  @Post('deletion-sweep')
  @ApiOperation({
    summary: 'Run deletion sweep (call from scheduler)',
    description: `Deletes schools past their retention window.\n\nOnly processes schools with exit_status=pending_deletion past deletion_scheduled_at.\n\nRequires: RequireRoleGuard (role='admin').`,
  })
  @ApiOkResponse({ description: 'Deletion sweep completed successfully' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  @ApiForbiddenResponse({ description: 'Not an admin' })
  sweep() {
    return this.service.runDeletionSweep();
  }
}
