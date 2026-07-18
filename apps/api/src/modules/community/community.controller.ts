import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../auth/guards/supabase-auth.guard';
import { CommunityService } from './community.service';

@ApiTags('community')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('community')
export class CommunityController {
  constructor(private readonly service: CommunityService) {}

  @Get('moments')
  @ApiOperation({
    summary: 'Community / moments library (teacher-facing)',
    description:
      'Shareable teaching moments and method highlights. Contains no child ' +
      'records or child-identifiable data by design.',
  })
  moments() {
    return this.service.getMoments();
  }
}
