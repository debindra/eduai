import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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
      'Shareable teaching moments and method highlights.\n\nContains no child records or child-identifiable data by design — purely pedagogical content library for teachers.',
  })
  @ApiOkResponse({ description: 'Community moments retrieved successfully' })
  @ApiUnauthorizedResponse({ description: 'Not authenticated' })
  moments() {
    return this.service.getMoments();
  }
}
